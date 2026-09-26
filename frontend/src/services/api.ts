import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'https://sih-26188-backend-ewln.onrender.com';

const api = axios.create({
  baseURL: API_URL,
});

// Automatically inject JWT tokens into request headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Redirect to login if token expires (401 unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.clear();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(formData: FormData) {
    const response = await api.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  async getMe() {
    const response = await api.get('/api/auth/users/me');
    return response.data;
  },
  logout() {
    localStorage.clear();
  }
};

export const screeningService = {
  async create(documentType: string) {
    const response = await api.post('/api/screenings', { document_type: documentType });
    return response.data;
  },
  async uploadDoc(screeningId: number, file: File) {
    const formData = new FormData();
    formData.append('screening_id', screeningId.toString());
    formData.append('file', file);
    const response = await api.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  async runOCR(screeningId: number, scenario: string) {
    const formData = new FormData();
    formData.append('screening_id', screeningId.toString());
    formData.append('scenario', scenario);
    const response = await api.post('/api/ocr/extract', formData);
    return response.data;
  },
  async runValidation(screeningId: number, scenario: string) {
    const formData = new FormData();
    formData.append('screening_id', screeningId.toString());
    formData.append('scenario', scenario);
    const response = await api.post('/api/documents/validate', formData);
    return response.data;
  },
  async runTampering(screeningId: number, scenario: string) {
    const formData = new FormData();
    formData.append('screening_id', screeningId.toString());
    formData.append('scenario', scenario);
    const response = await api.post('/api/tampering/analyze', formData);
    return response.data;
  },
  async runFaceVerify(screeningId: number, scenario: string, liveFile?: File) {
    const formData = new FormData();
    formData.append('screening_id', screeningId.toString());
    formData.append('scenario', scenario);
    if (liveFile) {
      formData.append('live_file', liveFile);
    }
    const response = await api.post('/api/face/verify', formData, {
      headers: liveFile ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return response.data;
  },
  async calculateRisk(screeningId: number, scenario: string) {
    const formData = new FormData();
    formData.append('screening_id', screeningId.toString());
    formData.append('scenario', scenario);
    const response = await api.post('/api/risk/calculate', formData);
    return response.data;
  },
  async runFullPipeline(screeningId: number, scenario: string, liveFile?: File) {
    const formData = new FormData();
    formData.append('scenario', scenario);
    if (liveFile) {
      formData.append('live_file', liveFile);
    }
    const response = await api.post(`/api/screenings/${screeningId}/analyze`, formData, {
      headers: liveFile ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return response.data;
  },
  async getDetail(id: number) {
    const response = await api.get(`/api/screenings/${id}`);
    return response.data;
  },
  async getHistory(params: {
    search?: string;
    document_type?: string;
    risk_level?: string;
    status?: string;
    sort_by?: string;
    sort_desc?: boolean;
    page?: number;
    limit?: number;
  }) {
    const response = await api.get('/api/history', { params });
    return response.data;
  },
  getReportPdfUrl(id: number) {
    return `${API_URL}/api/screenings/${id}/report`;
  },
  async verifyDocumentType(screeningId: number, selectedCategory: string): Promise<{
    detected_format: string;
    detected_label: string;
    confidence: number;
    explanation: string;
    is_match: boolean;
    is_uncertain: boolean;
  }> {
    const formData = new FormData();
    formData.append('screening_id', screeningId.toString());
    formData.append('selected_category', selectedCategory);
    const response = await api.post('/api/documents/verify-type', formData);
    return response.data;
  }
};

export const caseService = {
  async getCases() {
    const response = await api.get('/api/cases');
    return response.data;
  },
  async updateStatus(id: number, status: string) {
    const response = await api.put(`/api/cases/${id}/status`, { status });
    return response.data;
  }
};

export const auditService = {
  async getLogs() {
    const response = await api.get('/api/audit');
    return response.data;
  },
  async verifyChain() {
    const response = await api.get('/api/audit/verify');
    return response.data;
  }
};

export const analyticsService = {
  async getDashboard() {
    const response = await api.get('/api/analytics');
    return response.data;
  }
};

export default api;
