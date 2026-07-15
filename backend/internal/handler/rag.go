package handler

import (
	"encoding/csv"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/middleware"
	"github.com/adewalesamuel460/trustarmor-grc/backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// GetKnowledgeBase handles GET /workspaces/:workspace_id/knowledge-base
func (h *Handler) GetKnowledgeBase(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	items, err := h.repo.GetKnowledgeBase(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, items)
}

// CreateKnowledgeBaseItem handles POST /workspaces/:workspace_id/knowledge-base
func (h *Handler) CreateKnowledgeBaseItem(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	var req struct {
		Question   string   `json:"question"`
		Answer     string   `json:"answer"`
		SourceType string   `json:"source_type"`
		Tags       []string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Question == "" || req.Answer == "" {
		h.respondError(w, http.StatusBadRequest, "Question and answer fields are required")
		return
	}

	// Generate vector embedding using AI Service
	emb, err := h.worker.AI().GetEmbedding(r.Context(), req.Question)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to generate question embedding: "+err.Error())
		return
	}

	item := models.KnowledgeBaseItem{
		WorkspaceID: workspaceID,
		Question:    req.Question,
		Answer:      req.Answer,
		SourceType:  req.SourceType,
		Tags:        req.Tags,
	}
	if item.SourceType == "" {
		item.SourceType = "manual"
	}

	err = h.repo.CreateKnowledgeBaseItem(r.Context(), &item, emb)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit creation
	actorID := middleware.GetUserID(r.Context())
	ipAddress := r.RemoteAddr
	var actorEmail *string
	var actorIDPtr *string
	if actorID != "" {
		actorIDPtr = &actorID
		user, err := h.repo.GetUserByID(r.Context(), actorID)
		if err == nil {
			actorEmail = &user.Email
		}
	}

	h.auditSvc.LogEvent(
		workspaceID,
		actorIDPtr,
		actorEmail,
		"knowledge_base.item_created",
		"knowledge_base_item",
		item.ID,
		nil,
		map[string]interface{}{"question": item.Question},
		ipAddress,
	)

	h.respondJSON(w, http.StatusCreated, item)
}

// GetQuestionnaireProjects handles GET /workspaces/:workspace_id/questionnaires
func (h *Handler) GetQuestionnaireProjects(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	projects, err := h.repo.GetQuestionnaireProjects(r.Context(), workspaceID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, projects)
}

// UploadQuestionnaire handles POST /workspaces/:workspace_id/questionnaires/upload
func (h *Handler) UploadQuestionnaire(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	// Limit form size to 10MB
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "Failed to parse form: "+err.Error())
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		h.respondError(w, http.StatusBadRequest, "File field 'file' is required")
		return
	}
	defer file.Close()

	projectName := r.FormValue("name")
	if projectName == "" {
		projectName = header.Filename
	}

	// Parse CSV records
	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil && err != io.EOF {
		h.respondError(w, http.StatusBadRequest, "Invalid CSV format: "+err.Error())
		return
	}

	if len(records) == 0 {
		h.respondError(w, http.StatusBadRequest, "CSV file is empty")
		return
	}

	questionCol := 0
	// Check for a header row containing 'question'
	headerRowDetected := false
	for idx, col := range records[0] {
		if strings.Contains(strings.ToLower(col), "question") {
			questionCol = idx
			headerRowDetected = true
			break
		}
	}

	if headerRowDetected {
		records = records[1:]
	}

	var questions []string
	for _, row := range records {
		if questionCol < len(row) {
			q := strings.TrimSpace(row[questionCol])
			if q != "" {
				questions = append(questions, q)
			}
		}
	}

	if len(questions) == 0 {
		h.respondError(w, http.StatusBadRequest, "No valid questions found in CSV")
		return
	}

	// Create project header
	proj := models.QuestionnaireProject{
		WorkspaceID:    workspaceID,
		Name:           projectName,
		TotalQuestions: len(questions),
	}
	err = h.repo.CreateQuestionnaireProject(r.Context(), &proj)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Build questions pairs
	pairs := make([]models.QuestionnairePair, len(questions))
	for i, q := range questions {
		pairs[i] = models.QuestionnairePair{
			ProjectID:        proj.ID,
			OriginalQuestion: q,
		}
	}

	err = h.repo.CreateQuestionnairePairs(r.Context(), pairs)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Enqueue asynchronous background job to draft answers
	err = h.worker.EnqueueGenerateAnswers(proj.ID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, "Failed to enqueue RAG worker task: "+err.Error())
		return
	}

	// Audit log
	actorID := middleware.GetUserID(r.Context())
	ipAddress := r.RemoteAddr
	var actorEmail *string
	var actorIDPtr *string
	if actorID != "" {
		actorIDPtr = &actorID
		user, err := h.repo.GetUserByID(r.Context(), actorID)
		if err == nil {
			actorEmail = &user.Email
		}
	}

	h.auditSvc.LogEvent(
		workspaceID,
		actorIDPtr,
		actorEmail,
		"questionnaire.uploaded",
		"questionnaire_project",
		proj.ID,
		nil,
		map[string]interface{}{"name": proj.Name, "total_questions": proj.TotalQuestions},
		ipAddress,
	)

	h.respondJSON(w, http.StatusCreated, proj)
}

// GetQuestionnairePairs handles GET /workspaces/:workspace_id/questionnaires/:project_id/pairs
func (h *Handler) GetQuestionnairePairs(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	projectID := chi.URLParam(r, "project_id")
	if projectID == "" {
		h.respondError(w, http.StatusBadRequest, "Project ID is required")
		return
	}

	// Verify project access
	proj, err := h.repo.GetQuestionnaireProjectByID(r.Context(), projectID)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Questionnaire project not found")
		return
	}

	if proj.WorkspaceID != workspaceID {
		h.respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	pairs, err := h.repo.GetQuestionnairePairs(r.Context(), projectID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, pairs)
}

// ApproveQuestionnairePair handles POST /workspaces/:workspace_id/questionnaires/pairs/:pair_id/approve
func (h *Handler) ApproveQuestionnairePair(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if workspaceID == "" {
		workspaceID = middleware.GetWorkspaceID(r.Context())
	}

	if workspaceID == "" {
		h.respondError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	pairID := chi.URLParam(r, "pair_id")
	if pairID == "" {
		h.respondError(w, http.StatusBadRequest, "Pair ID is required")
		return
	}

	var req struct {
		FinalAnswer string `json:"final_answer"`
		AddToKB     bool   `json:"add_to_kb"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.FinalAnswer == "" {
		h.respondError(w, http.StatusBadRequest, "Final answer is required")
		return
	}

	reviewerID := middleware.GetUserID(r.Context())
	if reviewerID == "" {
		h.respondError(w, http.StatusUnauthorized, "Reviewer must be authenticated")
		return
	}

	// Execute Approval (saving final answer and incrementing counts)
	pair, err := h.repo.ApproveQuestionnairePair(r.Context(), pairID, req.FinalAnswer, reviewerID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Optionally auto-add the approved pair back into the knowledge_base_items for future reuse
	if req.AddToKB {
		emb, err := h.worker.AI().GetEmbedding(r.Context(), pair.OriginalQuestion)
		if err == nil {
			kbItem := models.KnowledgeBaseItem{
				WorkspaceID: workspaceID,
				Question:    pair.OriginalQuestion,
				Answer:      req.FinalAnswer,
				SourceType:  "past_questionnaire",
				Tags:        []string{"auto_added"},
			}
			_ = h.repo.CreateKnowledgeBaseItem(r.Context(), &kbItem, emb)
		}
	}

	// Audit log event
	actorID := middleware.GetUserID(r.Context())
	ipAddress := r.RemoteAddr
	var actorEmail *string
	var actorIDPtr *string
	if actorID != "" {
		actorIDPtr = &actorID
		user, err := h.repo.GetUserByID(r.Context(), actorID)
		if err == nil {
			actorEmail = &user.Email
		}
	}

	h.auditSvc.LogEvent(
		workspaceID,
		actorIDPtr,
		actorEmail,
		"questionnaire_pair.approved",
		"questionnaire_pair",
		pair.ID,
		nil,
		map[string]interface{}{"question": pair.OriginalQuestion},
		ipAddress,
	)

	h.respondJSON(w, http.StatusOK, pair)
}
