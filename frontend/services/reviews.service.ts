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
  isApproved?: boolean;
  metadata?: {
    verifiedPurchase?: boolean;
    helpfulCount?: number;
    reportedCount?: number;
  };
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
    
    const res = await apiClient.get<any>(
      `/reviews/product/${productId}?${params.toString()}`
    );
    const body = res.data;

    // Support both direct array and nested paginated data structures
    const items: Review[] = Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.data?.data)
        ? body.data.data
        : Array.isArray(body)
          ? body
          : [];

    const pagination = body?.meta?.pagination || body?.meta || body?.data?.meta || {};
    const total = Number(pagination.total ?? items.length);
    const pageNum = Number(pagination.page ?? page);
    const limitNum = Number(pagination.limit ?? limit);
    const totalPages = Number(pagination.totalPages ?? Math.max(1, Math.ceil(total / (limitNum || 10))));

    return {
      data: items,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        averageRating: Number(body?.meta?.average ?? body?.meta?.averageRating ?? 0),
        ratingDistribution: body?.meta?.distribution ?? body?.meta?.ratingDistribution ?? {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      },
    };
  },

  async getProductReviewStats(productId: number): Promise<ReviewStats> {
    const res = await apiClient.get<any>(
      `/reviews/product/${productId}/stats`
    );
    const raw = res.data?.data || res.data || {};
    const distribution = raw.distribution || raw.ratingDistribution || {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    return {
      average: Number(raw.average ?? raw.averageRating ?? 0),
      total: Number(raw.total ?? raw.totalReviews ?? 0),
      distribution: {
        1: Number(distribution[1] ?? 0),
        2: Number(distribution[2] ?? 0),
        3: Number(distribution[3] ?? 0),
        4: Number(distribution[4] ?? 0),
        5: Number(distribution[5] ?? 0),
      },
    };
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

  // ✅ Upload images separately if needed
  async uploadReviewImages(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    const res = await apiClient.post<any>(
      '/files/upload-multiple',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data?.data?.urls || res.data?.urls || [];
  },

  async updateReview(
    reviewId: number,
    reviewData: {
      rating?: number;
      title?: string;
      comment?: string;
      images?: string[];
      existingImages?: string[];
    }
  ): Promise<Review> {
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