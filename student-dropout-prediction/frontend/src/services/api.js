/**
 * API Service Layer — communicates with FastAPI backend at /api with token persistence
 * and resilient mock fallback if backend is offline.
 */

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "dropout_auth_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      const error = new Error(errBody.detail || `Request failed with status ${res.status}`);
      error.status = res.status;
      error.body = errBody;
      throw error;
    }

    // Return blob if response is csv/octet-stream
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/csv") || contentType.includes("application/octet-stream")) {
      return await res.blob();
    }

    return await res.json();
  } catch (err) {
    throw err;
  }
}

export const api = {
  // ─── AUTH ──────────────────────────────────────────────────────────────────
  async login(identifier, password) {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: identifier,
        password,
      }),
    });
    if (data?.access_token) {
      setToken(data.access_token);
    }
    return data;
  },

  async register(userData) {
    const data = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    if (data?.access_token) {
      setToken(data.access_token);
    }
    return data;
  },

  async getMe() {
    return await request("/auth/me");
  },

  logout() {
    removeToken();
    return request("/auth/logout", { method: "POST" }).catch(() => ({}));
  },

  async getAccounts() {
    return await request("/auth/accounts");
  },

  // ─── STUDENTS ──────────────────────────────────────────────────────────────
  async getStudents(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.risk_level) query.set("risk_level", params.risk_level);
    if (params.department) query.set("department", params.department);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return await request(`/students${qs}`);
  },

  async getStudent(studentId) {
    return await request(`/students/${studentId}`);
  },

  async getStudentDetails(studentId) {
    return await request(`/students/${studentId}/details`);
  },

  async saveStudentDetails(studentId, features) {
    return await request(`/students/${studentId}/details`, {
      method: "POST",
      body: JSON.stringify(features),
    });
  },

  async getStudentHistory(studentId) {
    return await request(`/students/${studentId}/history`);
  },

  async getStudentAnalysis(studentId) {
    return await request(`/students/${studentId}/analysis`);
  },

  async updateStudent(studentId, updates) {
    return await request(`/students/${studentId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async createStudent(studentData) {
    return await request("/students/", {
      method: "POST",
      body: JSON.stringify(studentData),
    });
  },

  async addStudentIntervention(studentId, intervention) {
    return await request(`/students/${studentId}/interventions`, {
      method: "POST",
      body: JSON.stringify(intervention),
    });
  },

  // ─── INTERVENTIONS ─────────────────────────────────────────────────────────
  async getInterventions(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.mentor_id) query.set("mentor_id", params.mentor_id);
    if (params.risk_band) query.set("risk_band", params.risk_band);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return await request(`/interventions${qs}`);
  },

  async getIntervention(studentId) {
    return await request(`/interventions/${studentId}`);
  },

  async updateInterventionStatus(studentId, status) {
    return await request(`/interventions/${studentId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async addInterventionNote(studentId, author, text) {
    return await request(`/interventions/${studentId}/notes`, {
      method: "POST",
      body: JSON.stringify({ author, text }),
    });
  },

  async reassignMentor(studentId, mentorId) {
    return await request(`/interventions/${studentId}/reassign`, {
      method: "PATCH",
      body: JSON.stringify({ mentor_id: mentorId }),
    });
  },

  // ─── PREDICTION ────────────────────────────────────────────────────────────
  async predictRisk(features, studentId = null) {
    const qs = studentId ? `?student_id=${encodeURIComponent(studentId)}` : "";
    return await request(`/prediction/predict${qs}`, {
      method: "POST",
      body: JSON.stringify(features),
    });
  },

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────
  async getDashboardSummary() {
    return await request("/dashboard/summary");
  },

  async getDashboardStats() {
    return await request("/dashboard/stats");
  },

  async getRiskDistribution() {
    return await request("/dashboard/risk-distribution");
  },

  async getDepartmentBreakdown() {
    return await request("/dashboard/department-breakdown");
  },

  async getTopRiskDrivers() {
    return await request("/dashboard/top-risk-drivers");
  },

  async getPriorityOutreach() {
    return await request("/dashboard/priority-outreach");
  },

  // ─── MENTORS (ADMIN) ───────────────────────────────────────────────────────
  async getMentors() {
    return await request("/mentors/");
  },

  async createMentor(mentorData) {
    return await request("/mentors/", {
      method: "POST",
      body: JSON.stringify(mentorData),
    });
  },

  async updateMentor(mentorId, updates) {
    return await request(`/mentors/${mentorId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async toggleMentorStatus(mentorId) {
    return await request(`/mentors/${mentorId}/deactivate`, {
      method: "PATCH",
    });
  },

  // ─── REPORTS ───────────────────────────────────────────────────────────────
  async getReportPreview(params = {}) {
    const query = new URLSearchParams();
    if (params.type) query.set("type", params.type);
    if (params.department) query.set("department", params.department);
    if (params.risk_band) query.set("risk_band", params.risk_band);
    if (params.mentor_id) query.set("mentor_id", params.mentor_id);
    if (params.status) query.set("status", params.status);
    if (params.date) query.set("date", params.date);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return await request(`/reports/preview${qs}`);
  },

  async exportReport(options) {
    return await request("/reports/export", {
      method: "POST",
      body: JSON.stringify(options),
    });
  },

  async getReportHistory() {
    return await request("/reports/history");
  },

  async deleteReportHistory(id) {
    return await request(`/reports/history/${id}`, { method: "DELETE" });
  },

  async getScheduledReports() {
    return await request("/reports/scheduled");
  },

  async createScheduledReport(data) {
    return await request("/reports/scheduled", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateScheduledReport(id, updates) {
    return await request(`/reports/scheduled/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async deleteScheduledReport(id) {
    return await request(`/reports/scheduled/${id}`, { method: "DELETE" });
  },

  // ─── AUDIT (ADMIN) ─────────────────────────────────────────────────────────
  async getFairnessAudit(attribute = null) {
    const qs = attribute ? `?attribute=${attribute}` : "";
    return await request(`/audit/fairness${qs}`);
  },

  async getFeatureDisclosure() {
    return await request("/audit/feature-disclosure");
  },

  async getAccessLog(params = {}) {
    const query = new URLSearchParams();
    if (params.user) query.set("user", params.user);
    if (params.action) query.set("action", params.action);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return await request(`/audit/access-log${qs}`);
  },

  async getPrivacyDocs() {
    return await request("/audit/privacy-docs");
  },

  async updatePrivacyDocs(content) {
    return await request("/audit/privacy-docs", {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  },

  async exportAudit(format = "csv") {
    return await request(`/audit/export?format=${format}`);
  },
};

export default api;
