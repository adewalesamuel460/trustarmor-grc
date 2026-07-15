package repository

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/jackc/pgx/v5"
)

// cosineSimilarity computes similarity between two float32 vectors in Go.
// Used as a fallback when pgvector extension is not available.
func cosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0
	}
	var dot, normA, normB float64
	for i := range a {
		dot += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}
	if normA == 0 || normB == 0 {
		return 0
	}
	return dot / (math.Sqrt(normA) * math.Sqrt(normB))
}

// GetKnowledgeBase retrieves all KB entries in a workspace
func (r *Repository) GetKnowledgeBase(ctx context.Context, workspaceID string) ([]models.KnowledgeBaseItem, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, workspace_id, question, answer, source_type, tags, created_at, updated_at
		FROM knowledge_base_items
		WHERE workspace_id = $1
		ORDER BY created_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query knowledge base: %w", err)
	}
	defer rows.Close()

	var items []models.KnowledgeBaseItem
	for rows.Next() {
		var item models.KnowledgeBaseItem
		err := rows.Scan(
			&item.ID, &item.WorkspaceID, &item.Question, &item.Answer,
			&item.SourceType, &item.Tags, &item.CreatedAt, &item.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan knowledge base item: %w", err)
		}
		items = append(items, item)
	}
	return items, nil
}

// CreateKnowledgeBaseItem inserts a new KB item storing the embedding as a native FLOAT[] array.
func (r *Repository) CreateKnowledgeBaseItem(ctx context.Context, item *models.KnowledgeBaseItem, embedding []float32) error {
	// Convert float32 slice to float64 slice for PostgreSQL FLOAT[] compatibility
	embF64 := make([]float64, len(embedding))
	for i, v := range embedding {
		embF64[i] = float64(v)
	}
	if len(embF64) == 0 {
		// Store a zero vector placeholder when no embedding is available
		embF64 = make([]float64, 1536)
	}

	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO knowledge_base_items (workspace_id, question, answer, source_type, tags, embedding)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at;
	`, item.WorkspaceID, item.Question, item.Answer, item.SourceType, item.Tags, embF64).Scan(&item.ID, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create knowledge base item: %w", err)
	}

	return nil
}

// SearchSimilarityKB fetches all KB embeddings and computes cosine similarity in Go.
// This is a standard-PostgreSQL-compatible fallback (no pgvector required).
func (r *Repository) SearchSimilarityKB(ctx context.Context, workspaceID string, queryEmbedding []float32, limit int) ([]models.KnowledgeBaseItem, []float64, error) {
	if len(queryEmbedding) == 0 {
		return nil, nil, errors.New("empty query embedding vector")
	}

	// Convert query to float64
	query := make([]float64, len(queryEmbedding))
	for i, v := range queryEmbedding {
		query[i] = float64(v)
	}

	// Fetch all embeddings for the workspace (KB is typically small, < 10k items)
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, question, answer, source_type, tags, embedding, created_at, updated_at
		FROM knowledge_base_items
		WHERE workspace_id = $1;
	`, workspaceID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch KB for similarity search: %w", err)
	}
	defer rows.Close()

	type scoredItem struct {
		item  models.KnowledgeBaseItem
		score float64
	}
	var candidates []scoredItem

	for rows.Next() {
		var item models.KnowledgeBaseItem
		var emb []float64
		err := rows.Scan(
			&item.ID, &item.Question, &item.Answer, &item.SourceType, &item.Tags,
			&emb, &item.CreatedAt, &item.UpdatedAt,
		)
		if err != nil {
			continue
		}
		score := cosineSimilarity(query, emb)
		candidates = append(candidates, scoredItem{item: item, score: score})
	}

	// Sort by descending similarity score
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].score > candidates[j].score
	})

	// Return top-N results
	var items []models.KnowledgeBaseItem
	var scores []float64
	for i, c := range candidates {
		if i >= limit {
			break
		}
		items = append(items, c.item)
		scores = append(scores, c.score)
	}

	_ = fmt.Sprintf // suppress unused import
	return items, scores, nil
}

// CreateQuestionnaireProject inserts project header
func (r *Repository) CreateQuestionnaireProject(ctx context.Context, p *models.QuestionnaireProject) error {
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO questionnaire_projects (workspace_id, name, status, total_questions, completed_questions)
		VALUES ($1, $2, 'draft', $3, 0)
		RETURNING id, created_at;
	`, p.WorkspaceID, p.Name, p.TotalQuestions).Scan(&p.ID, &p.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create questionnaire project: %w", err)
	}
	p.Status = "draft"
	p.CompletedQuestions = 0
	return nil
}

// CreateQuestionnairePairs bulk inserts questions
func (r *Repository) CreateQuestionnairePairs(ctx context.Context, pairs []models.QuestionnairePair) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for i := range pairs {
		err := tx.QueryRow(ctx, `
			INSERT INTO questionnaire_pairs (project_id, original_question, status)
			VALUES ($1, $2, 'pending')
			RETURNING id, created_at;
		`, pairs[i].ProjectID, pairs[i].OriginalQuestion).Scan(&pairs[i].ID, &pairs[i].CreatedAt)
		if err != nil {
			return fmt.Errorf("failed to insert question pair: %w", err)
		}
		pairs[i].Status = "pending"
	}

	return tx.Commit(ctx)
}

// GetQuestionnaireProjectByID retrieves project summary
func (r *Repository) GetQuestionnaireProjectByID(ctx context.Context, id string) (*models.QuestionnaireProject, error) {
	var p models.QuestionnaireProject
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, workspace_id, name, status, total_questions, completed_questions, created_at
		FROM questionnaire_projects
		WHERE id = $1;
	`, id).Scan(&p.ID, &p.WorkspaceID, &p.Name, &p.Status, &p.TotalQuestions, &p.CompletedQuestions, &p.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("project not found: %w", err)
		}
		return nil, fmt.Errorf("failed to get project: %w", err)
	}
	return &p, nil
}

// GetQuestionnaireProjects retrieves list of projects in workspace
func (r *Repository) GetQuestionnaireProjects(ctx context.Context, workspaceID string) ([]models.QuestionnaireProject, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, workspace_id, name, status, total_questions, completed_questions, created_at
		FROM questionnaire_projects
		WHERE workspace_id = $1
		ORDER BY created_at DESC;
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.QuestionnaireProject
	for rows.Next() {
		var p models.QuestionnaireProject
		err := rows.Scan(&p.ID, &p.WorkspaceID, &p.Name, &p.Status, &p.TotalQuestions, &p.CompletedQuestions, &p.CreatedAt)
		if err == nil {
			list = append(list, p)
		}
	}
	return list, nil
}

// GetQuestionnairePairs lists questions nested inside a project
func (r *Repository) GetQuestionnairePairs(ctx context.Context, projectID string) ([]models.QuestionnairePair, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT qp.id, qp.project_id, qp.original_question, qp.ai_draft_answer, qp.final_answer, qp.confidence_score, qp.status, qp.reviewer_id, u.email as reviewer_email, qp.created_at
		FROM questionnaire_pairs qp
		LEFT JOIN users u ON qp.reviewer_id = u.id
		WHERE qp.project_id = $1
		ORDER BY qp.created_at ASC;
	`, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to query pairs: %w", err)
	}
	defer rows.Close()

	var pairs []models.QuestionnairePair
	for rows.Next() {
		var q models.QuestionnairePair
		err := rows.Scan(
			&q.ID, &q.ProjectID, &q.OriginalQuestion, &q.AIDraftAnswer, &q.FinalAnswer,
			&q.ConfidenceScore, &q.Status, &q.ReviewerID, &q.ReviewerEmail, &q.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan pair: %w", err)
		}
		pairs = append(pairs, q)
	}
	return pairs, nil
}

// ApproveQuestionnairePair approves AI draft, incrementing counters transactionally
func (r *Repository) ApproveQuestionnairePair(ctx context.Context, pairID string, finalAnswer string, reviewerID string) (*models.QuestionnairePair, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 1. Fetch current pair status & project ID
	var currentStatus string
	var projectID string
	err = tx.QueryRow(ctx, `
		SELECT status, project_id FROM questionnaire_pairs
		WHERE id = $1;
	`, pairID).Scan(&currentStatus, &projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to find question pair: %w", err)
	}

	// 2. Update pair
	var q models.QuestionnairePair
	err = tx.QueryRow(ctx, `
		UPDATE questionnaire_pairs
		SET final_answer = $1, status = 'approved', reviewer_id = $2
		WHERE id = $3
		RETURNING id, project_id, original_question, ai_draft_answer, final_answer, confidence_score, status, reviewer_id, created_at;
	`, finalAnswer, reviewerID, pairID).Scan(
		&q.ID, &q.ProjectID, &q.OriginalQuestion, &q.AIDraftAnswer, &q.FinalAnswer,
		&q.ConfidenceScore, &q.Status, &q.ReviewerID, &q.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update pair approval: %w", err)
	}

	// 3. Increment completed count if transition from unapproved
	if currentStatus != "approved" {
		_, err = tx.Exec(ctx, `
			UPDATE questionnaire_projects
			SET completed_questions = completed_questions + 1
			WHERE id = $1;
		`, projectID)
		if err != nil {
			return nil, fmt.Errorf("failed to increment project completed count: %w", err)
		}

		// Also check if project is fully completed
		var total, completed int
		err = tx.QueryRow(ctx, `
			SELECT total_questions, completed_questions FROM questionnaire_projects
			WHERE id = $1;
		`, projectID).Scan(&total, &completed)
		if err == nil && completed >= total {
			_, _ = tx.Exec(ctx, `UPDATE questionnaire_projects SET status = 'completed' WHERE id = $1;`, projectID)
		} else if err == nil {
			_, _ = tx.Exec(ctx, `UPDATE questionnaire_projects SET status = 'in_review' WHERE id = $1;`, projectID)
		}
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, err
	}

	return &q, nil
}

// UpdateProjectStatus updates the status flag
func (r *Repository) UpdateProjectStatus(ctx context.Context, id string, status string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE questionnaire_projects
		SET status = $1
		WHERE id = $2;
	`, status, id)
	return err
}

// SavePairDraft registers draft answers from worker
func (r *Repository) SavePairDraft(ctx context.Context, pairID string, draft string, confidence float64) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE questionnaire_pairs
		SET ai_draft_answer = $1, confidence_score = $2, status = 'drafted'
		WHERE id = $3;
	`, draft, confidence, pairID)
	return err
}
