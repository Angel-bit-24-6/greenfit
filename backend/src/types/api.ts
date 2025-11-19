// API Response types

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
    // Additional meta fields for employee operations
    filters?: any;
    previousStatus?: string;
    newStatus?: string;
    updatedBy?: string;
    timestamp?: string;
    // Allow any additional meta properties for flexibility
    [key: string]: any;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ChatRequest {
  user_id: string;
  message: string;
  context?: {
    previousMessages?: string[];
    currentCart?: any[];
    userPreferences?: {
      dietaryRestrictions: string[];
      allergens: string[];
      favoriteIngredients: string[];
    };
  };
}

export interface ChatResponse {
  intent: 'recommend' | 'customize' | 'add_to_cart' | 'query' | 'suggestion' | 'other';
  requested_items: Array<{
    text: string;
    matched_id: string | null;
    confidence: number;
  }>;
  diet_constraints: string[];
  action: 'recommend' | 'confirm_add' | 'ask_clarification' | 'create_suggestion';
  options: Array<{
    id: string;
    name: string;
    reason: string;
    score: number;
  }>;
  buttons: Array<{
    label: string;
    payload: {
      type: 'add' | 'confirm_alias' | 'suggest' | 'cancel';
      id?: string;
      data?: any;
    };
  }>;
  text: string;
}

export interface ValidationRequest {
  items: Array<{
    id: string;
    type: 'plate' | 'custom';
    plateId?: string;
    customIngredients?: string[];
    quantity: number;
  }>;
}

export interface ValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  unavailableItems: Array<{
    id: string;
    reason: string;
    alternatives?: string[];
  }>;
  updatedPrices?: Array<{
    itemId: string;
    newPrice: number;
    oldPrice: number;
  }>;
}

export interface CartAddRequest {
  user_id: string;
  item_id?: string;
  type: 'plate' | 'custom';
  plateId?: string;
  custom_ingredients?: string[];
  quantity: number;
}

export interface CartAddResponse extends ApiResponse {
  data?: {
    cart: {
      id: string;
      items: any[];
      totalPrice: number;
      totalItems: number;
    };
    addedItem: {
      id: string;
      name: string;
      quantity: number;
      price: number;
    };
  };
}