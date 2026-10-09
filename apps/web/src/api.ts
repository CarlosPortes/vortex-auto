const API_BASE_URL = '/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('vortex_token');
}

export function setStoredToken(token: string): void {
  localStorage.setItem('vortex_token', token);
}

export function clearStoredToken(): void {
  localStorage.removeItem('vortex_token');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ sucesso: boolean; dados?: T; mensagem?: string; erros?: any[] }> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data;
  } catch (err: any) {
    return {
      sucesso: false,
      mensagem: err.message || 'Falha de comunicação com o servidor',
    };
  }
}
