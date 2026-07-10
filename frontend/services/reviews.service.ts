// services/reviews.service.ts
import { apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types';

export interface Review {
  id: number;
  user: {
    id: number;
    name: string;
  };
  product: {
    id: number;
    title: string;
  };
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  average: number;
  total: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ReviewResponse {
  data: Review[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    averageRating: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
}

export const reviewsService = {
  async getProductReviews(
    productId: number,
    page: number = 1,
    limit: number = 10,
    rating?: number
  ): Promise<ReviewResponse> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (rating) params.append('rating', String(rating));
    
    const { data } = await apiClient.get<ApiResponse<ReviewResponse>>(
      `/reviews/product/${productId}?${params.toString()}`
    );
    return data.data;
  },

  async getProductReviewStats(productId: number): Promise<ReviewStats> {
    const { data } = await apiClient.get<ApiResponse<ReviewStats>>(
      `/reviews/product/${productId}/stats`
    );
    return data.data;
  },

  async createReview(reviewData: {
    productId: number;
    rating: number;
    title?: string;
    comment: string;
    images?: string[];
  }): Promise<Review> {
    const { data } = await apiClient.post<ApiResponse<Review>>('/reviews', reviewData);
    return data.data;
  },

  async updateReview(reviewId: number, reviewData: {
    rating?: number;
    title?: string;
    comment?: string;
  }): Promise<Review> {
    const { data } = await apiClient.put<ApiResponse<Review>>(
      `/reviews/${reviewId}`,
      reviewData
    );
    return data.data;
  },

  async deleteReview(reviewId: number): Promise<void> {
    await apiClient.delete(`/reviews/${reviewId}`);
  },

  async markHelpful(reviewId: number): Promise<void> {
    await apiClient.post(`/reviews/${reviewId}/helpful`);
  },

  async reportReview(reviewId: number): Promise<void> {
    await apiClient.post(`/reviews/${reviewId}/report`);
  },
};