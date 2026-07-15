package service

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type StorageService interface {
	Upload(ctx context.Context, filename string, file io.Reader) (string, error)
	Presign(ctx context.Context, fileURL string, expiration time.Duration) (string, error)
}

type LocalStorage struct {
	uploadDir string
	baseURL   string
}

func NewLocalStorage(uploadDir, baseURL string) (*LocalStorage, error) {
	err := os.MkdirAll(uploadDir, 0755)
	if err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}
	return &LocalStorage{
		uploadDir: uploadDir,
		baseURL:   baseURL,
	}, nil
}

func (l *LocalStorage) Upload(ctx context.Context, filename string, file io.Reader) (string, error) {
	destPath := filepath.Join(l.uploadDir, filename)
	out, err := os.Create(destPath)
	if err != nil {
		return "", fmt.Errorf("failed to create local file: %w", err)
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	if err != nil {
		return "", fmt.Errorf("failed to copy file to local storage: %w", err)
	}

	return fmt.Sprintf("%s/uploads/%s", l.baseURL, filename), nil
}

func (l *LocalStorage) Presign(ctx context.Context, fileURL string, expiration time.Duration) (string, error) {
	// For local mockup, just return the direct HTTP url which is always downloadable.
	return fileURL, nil
}

type S3Storage struct {
	client *s3.Client
	bucket string
}

func NewS3Storage(ctx context.Context, bucket, region, accessKey, secretKey string) (*S3Storage, error) {
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("unable to load AWS SDK config: %w", err)
	}

	client := s3.NewFromConfig(cfg)
	return &S3Storage{
		client: client,
		bucket: bucket,
	}, nil
}

func (s *S3Storage) Upload(ctx context.Context, filename string, file io.Reader) (string, error) {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(filename),
		Body:   file,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload file to S3: %w", err)
	}

	return fmt.Sprintf("https://%s.s3.amazonaws.com/%s", s.bucket, filename), nil
}

func (s *S3Storage) Presign(ctx context.Context, fileURL string, expiration time.Duration) (string, error) {
	// Extract key from URL
	parts := strings.Split(fileURL, "/")
	key := parts[len(parts)-1]

	presignClient := s3.NewPresignClient(s.client)
	presignedReq, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(expiration))
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned S3 url: %w", err)
	}

	return presignedReq.URL, nil
}
