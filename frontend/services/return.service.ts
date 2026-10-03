import { apiClient } from '@/lib/api-client';
import {
  ReturnRequest,
  CreateReturnData,
  ProcessReturnData,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

export const returnService = {
  async createReturn(returnData: CreateReturnData): Promise<ReturnRequest> {
    const { data } = await apiClient.post<ApiResponse<ReturnRequest>>('/returns', returnData);
    return data.data;
  },

  async getMyReturns(page = 1, limit = 10): Promise<PaginatedResponse<ReturnRequest>> {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<ReturnRequest>>>(
      `/returns/my?page=${page}&limit=${limit}`,
    );
    return data.data;
  },

  async getVendorReturns(page = 1, limit = 10): Promise<PaginatedResponse<ReturnRequest>> {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<ReturnRequest>>>(
      `/returns/vendor?page=${page}&limit=${limit}`,
    );
    return data.data;
  },

  async processVendorReturn(id: number, processData: ProcessReturnData): Promise<ReturnRequest> {
    const { data } = await apiClient.patch<ApiResponse<ReturnRequest>>(
      `/returns/vendor/${id}/process`,
      processData,
    );
    return data.data;
  },

  async getAdminReturns(page = 1, limit = 10): Promise<PaginatedResponse<ReturnRequest>> {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<ReturnRequest>>>(
      `/returns/admin?page=${page}&limit=${limit}`,
    );
    return data.data;
  },

  async processAdminReturn(id: number, processData: ProcessReturnData): Promise<ReturnRequest> {
    const { data } = await apiClient.patch<ApiResponse<ReturnRequest>>(
      `/returns/admin/${id}/process`,
      processData,
    );
    return data.data;
  },
};
