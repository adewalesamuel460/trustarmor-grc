package collectors

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type GitHubCreds struct {
	Token string `json:"token"`
	Owner string `json:"owner,omitempty"`
	Repo  string `json:"repo,omitempty"`
}

type GitHubRepository struct {
	ID            int64  `json:"id"`
	Name          string `json:"name"`
	FullName      string `json:"full_name"`
	HTMLURL       string `json:"html_url"`
	DefaultBranch string `json:"default_branch"`
	Private       bool   `json:"private"`
	Owner         struct {
		Login string `json:"login"`
	} `json:"owner"`
}

type GitHubBranchProtection struct {
	RequiredPullRequestReviews *struct {
		RequiredApprovingReviewCount int `json:"required_approving_review_count"`
	} `json:"required_pull_request_reviews"`
}

type GitHubCollector struct {
	client *http.Client
}

func NewGitHubCollector() *GitHubCollector {
	return &GitHubCollector{
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *GitHubCollector) ProviderName() string {
	return "GitHub"
}

func parseGitHubCreds(plaintextCreds []byte) (GitHubCreds, error) {
	if len(plaintextCreds) == 0 {
		return GitHubCreds{}, errors.New("empty GitHub token credentials")
	}

	var creds GitHubCreds
	if err := json.Unmarshal(plaintextCreds, &creds); err == nil && creds.Token != "" {
		return creds, nil
	}

	// Try raw token string fallback
	rawToken := strings.TrimSpace(string(plaintextCreds))
	if rawToken != "" {
		return GitHubCreds{Token: rawToken}, nil
	}

	return GitHubCreds{}, errors.New("invalid or unparseable GitHub credentials token")
}

func (c *GitHubCollector) FetchAssets(ctx context.Context, encryptedCreds []byte, plaintextCreds []byte) ([]CollectorResult, error) {
	creds, err := parseGitHubCreds(plaintextCreds)
	if err != nil {
		return nil, fmt.Errorf("GitHub credential parsing failed: %w", err)
	}

	var repos []GitHubRepository

	if creds.Owner != "" && creds.Repo != "" {
		// Fetch specific target repo
		repoUrl := fmt.Sprintf("https://api.github.com/repos/%s/%s", creds.Owner, creds.Repo)
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, repoUrl, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+creds.Token)
		req.Header.Set("Accept", "application/vnd.github+json")

		resp, err := c.client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("GitHub API connection error: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
			return nil, fmt.Errorf("GitHub API authentication failed (HTTP %d): invalid or expired token", resp.StatusCode)
		}
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("GitHub API returned error (HTTP %d): %s", resp.StatusCode, string(body))
		}

		var singleRepo GitHubRepository
		if err := json.NewDecoder(resp.Body).Decode(&singleRepo); err != nil {
			return nil, fmt.Errorf("failed to decode GitHub repo response: %w", err)
		}
		repos = append(repos, singleRepo)
	} else {
		// Fetch all accessible user/org repos
		reposUrl := "https://api.github.com/user/repos?per_page=100&sort=updated"
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, reposUrl, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+creds.Token)
		req.Header.Set("Accept", "application/vnd.github+json")

		resp, err := c.client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("GitHub API connection error: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
			return nil, fmt.Errorf("GitHub API authentication failed (HTTP %d): invalid or expired token", resp.StatusCode)
		}
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("GitHub API returned error (HTTP %d): %s", resp.StatusCode, string(body))
		}

		if err := json.NewDecoder(resp.Body).Decode(&repos); err != nil {
			return nil, fmt.Errorf("failed to decode GitHub repos list response: %w", err)
		}
	}

	var results []CollectorResult

	for _, repo := range repos {
		defaultBranch := repo.DefaultBranch
		if defaultBranch == "" {
			defaultBranch = "main"
		}

		// Fetch branch protection rules for default branch
		protectionUrl := fmt.Sprintf("https://api.github.com/repos/%s/%s/branches/%s/protection", repo.Owner.Login, repo.Name, defaultBranch)
		pReq, err := http.NewRequestWithContext(ctx, http.MethodGet, protectionUrl, nil)
		if err != nil {
			continue
		}
		pReq.Header.Set("Authorization", "Bearer "+creds.Token)
		pReq.Header.Set("Accept", "application/vnd.github+json")

		pResp, err := c.client.Do(pReq)
		requiresApprovingReviews := false
		approvingReviewCount := 0

		if err == nil {
			if pResp.StatusCode == http.StatusOK {
				var protection GitHubBranchProtection
				if json.NewDecoder(pResp.Body).Decode(&protection) == nil {
					if protection.RequiredPullRequestReviews != nil {
						requiresApprovingReviews = true
						approvingReviewCount = protection.RequiredPullRequestReviews.RequiredApprovingReviewCount
					}
				}
			}
			pResp.Body.Close()
		}

		extID := repo.HTMLURL
		if extID == "" {
			extID = fmt.Sprintf("github.com/%s/%s", repo.Owner.Login, repo.Name)
		}

		results = append(results, CollectorResult{
			AssetType:  "repository",
			ExternalID: extID,
			Name:       repo.Name,
			RawData: map[string]interface{}{
				"default_branch":             defaultBranch,
				"requires_approving_reviews": requiresApprovingReviews,
				"approving_review_count":     approvingReviewCount,
				"private":                    repo.Private,
				"owner":                      repo.Owner.Login,
			},
			ComplianceRisk: approvingReviewCount == 0,
		})
	}

	return results, nil
}
