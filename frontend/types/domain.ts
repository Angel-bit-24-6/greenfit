// Tipos del dominio de la aplicación

export interface Ingredient {
  id: string;
  name: string;
  synonyms: string[];
  stock: number;
  price: number;
  allergens: string[];
  tags: string[];
  available: boolean;
  description?: string;
  image?: string;
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

export interface Plate {
  id: string;
  name: string;
  description: string;
  ingredients: string[]; // Array de ingredient IDs
  price: number;
  tags: string[];
  available: boolean;
  image?: string;
  preparationTime?: number;
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

export interface Catalog {
  ingredients: Ingredient[];
  plates: Plate[];
  lastUpdated: string;
}

export interface IngredientDetail {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isCustom?: boolean; // true if added by user, false if part of base plate
}

export interface CartItem {
  id: string;
  type: 'plate' | 'custom';
  plateId?: string;
  customIngredients?: string[]; // Array of ingredient IDs for custom plates
  customIngredientsDetails?: IngredientDetail[]; // Full details for custom ingredients
  baseIngredients?: IngredientDetail[]; // Base ingredients for plates (no extra cost)
  quantity: number;
  price: number;
  name: string;
  image?: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  preferences: {
    dietaryRestrictions: string[];
    allergens: string[];
    favoriteIngredients: string[];
  };
  createdAt: string;
  role?: string; // Optional role field for employees
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  createdAt: string;
  estimatedDelivery?: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  type: 'user' | 'bot';
  timestamp: string;
  buttons?: ChatButton[];
  options?: ChatOption[];
}

export interface ChatButton {
  label: string;
  payload: {
    type: 'add' | 'confirm_alias' | 'suggest' | 'cancel';
    id?: string;
    data?: any;
  };
}

export interface ChatOption {
  id: string;
  name: string;
  reason: string;
  score: number;
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
  options: ChatOption[];
  buttons: ChatButton[];
  text: string;
}

export interface Suggestion {
  id: string;
  userId: string;
  originalText: string;
  extractedEntities: string[];
  fuzzyCandidates: Array<{
    id: string;
    score: number;
  }>;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  adminNotes?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  unavailableItems: string[];
}