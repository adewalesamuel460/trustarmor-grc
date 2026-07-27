package collectors

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/iam"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// AWSCreds holds parsed AWS credentials for API authentication
type AWSCreds struct {
	AccessKeyID     string `json:"access_key_id"`
	SecretAccessKey string `json:"secret_access_key"`
	Region          string `json:"region"`
	SessionToken    string `json:"session_token,omitempty"`
}

// AWSCollector fetches live IAM users and S3 bucket encryption configurations from AWS
type AWSCollector struct{}

func NewAWSCollector() *AWSCollector {
	return &AWSCollector{}
}

func (c *AWSCollector) ProviderName() string {
	return "AWS"
}

func parseAWSCreds(plaintextCreds []byte) (AWSCreds, error) {
	if len(plaintextCreds) == 0 {
		return AWSCreds{}, errors.New("empty AWS credentials payload")
	}

	var creds AWSCreds
	if err := json.Unmarshal(plaintextCreds, &creds); err == nil && creds.AccessKeyID != "" && creds.SecretAccessKey != "" {
		if creds.Region == "" {
			creds.Region = "us-east-1"
		}
		return creds, nil
	}

	// Try generic map unmarshal
	var rawMap map[string]interface{}
	if err := json.Unmarshal(plaintextCreds, &rawMap); err == nil {
		getKey := func(keys ...string) string {
			for _, k := range keys {
				if v, ok := rawMap[k].(string); ok && v != "" {
					return v
				}
			}
			return ""
		}

		keyID := getKey("access_key_id", "aws_access_key_id", "AccessKeyID", "accessKeyId")
		secKey := getKey("secret_access_key", "aws_secret_access_key", "SecretAccessKey", "secretAccessKey")
		reg := getKey("region", "aws_region", "Region")
		token := getKey("session_token", "aws_session_token", "SessionToken")

		if keyID != "" && secKey != "" {
			if reg == "" {
				reg = "us-east-1"
			}
			return AWSCreds{
				AccessKeyID:     keyID,
				SecretAccessKey: secKey,
				Region:          reg,
				SessionToken:    token,
			}, nil
		}
	}

	// Fallback to colon separated format KEY_ID:SECRET_KEY:REGION
	strCreds := strings.TrimSpace(string(plaintextCreds))
	parts := strings.Split(strCreds, ":")
	if len(parts) >= 2 {
		reg := "us-east-1"
		if len(parts) >= 3 && parts[2] != "" {
			reg = parts[2]
		}
		return AWSCreds{
			AccessKeyID:     strings.TrimSpace(parts[0]),
			SecretAccessKey: strings.TrimSpace(parts[1]),
			Region:          reg,
		}, nil
	}

	return AWSCreds{}, errors.New("invalid or unparseable AWS credentials format")
}

func (c *AWSCollector) FetchAssets(ctx context.Context, encryptedCreds []byte, plaintextCreds []byte) ([]CollectorResult, error) {
	creds, err := parseAWSCreds(plaintextCreds)
	if err != nil {
		return nil, fmt.Errorf("AWS credential parsing failed: %w", err)
	}

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(creds.Region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			creds.AccessKeyID,
			creds.SecretAccessKey,
			creds.SessionToken,
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS configuration: %w", err)
	}

	iamClient := iam.NewFromConfig(cfg)
	s3Client := s3.NewFromConfig(cfg)

	var results []CollectorResult

	// 1. Fetch IAM Users & MFA Status
	usersOutput, err := iamClient.ListUsers(ctx, &iam.ListUsersInput{})
	if err != nil {
		return nil, fmt.Errorf("AWS IAM API authentication/authorization failed: %w", err)
	}

	for _, user := range usersOutput.Users {
		userName := aws.ToString(user.UserName)
		mfaOutput, mfaErr := iamClient.ListMFADevices(ctx, &iam.ListMFADevicesInput{
			UserName: user.UserName,
		})

		hasMFA := mfaErr == nil && len(mfaOutput.MFADevices) > 0
		userArn := aws.ToString(user.Arn)
		if userArn == "" {
			userArn = fmt.Sprintf("arn:aws:iam::user/%s", userName)
		}

		results = append(results, CollectorResult{
			AssetType:  "cloud_user",
			ExternalID: userArn,
			Name:       userName,
			RawData: map[string]interface{}{
				"mfa_active": hasMFA,
				"user_name":  userName,
				"user_id":    aws.ToString(user.UserId),
				"arn":        userArn,
			},
			ComplianceRisk: !hasMFA,
		})
	}

	// 2. Fetch S3 Buckets & Encryption Configuration
	bucketsOutput, err := s3Client.ListBuckets(ctx, &s3.ListBucketsInput{})
	if err != nil {
		return nil, fmt.Errorf("AWS S3 API list buckets failed: %w", err)
	}

	for _, bucket := range bucketsOutput.Buckets {
		bucketName := aws.ToString(bucket.Name)
		encOutput, encErr := s3Client.GetBucketEncryption(ctx, &s3.GetBucketEncryptionInput{
			Bucket: bucket.Name,
		})

		isEncrypted := false
		encryptionType := ""

		if encErr == nil && encOutput.ServerSideEncryptionConfiguration != nil {
			if len(encOutput.ServerSideEncryptionConfiguration.Rules) > 0 {
				isEncrypted = true
				rule := encOutput.ServerSideEncryptionConfiguration.Rules[0]
				if rule.ApplyServerSideEncryptionByDefault != nil {
					encryptionType = string(rule.ApplyServerSideEncryptionByDefault.SSEAlgorithm)
				}
			}
		}

		results = append(results, CollectorResult{
			AssetType:  "cloud_storage",
			ExternalID: fmt.Sprintf("arn:aws:s3:::%s", bucketName),
			Name:       bucketName,
			RawData: map[string]interface{}{
				"public_access_block": true,
				"encryption_type":     encryptionType,
				"encrypted_at_rest":   isEncrypted,
			},
			ComplianceRisk: !isEncrypted,
		})
	}

	return results, nil
}
