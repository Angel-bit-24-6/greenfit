// Helper functions for JSON parsing - Compatible with both PostgreSQL JSON and SQLite strings

export function parseJsonArray(jsonValue: any): any[] {
  if (!jsonValue) return [];
  
  // If it's already an array (PostgreSQL JSON type)
  if (Array.isArray(jsonValue)) return jsonValue;
  
  // If it's a string (SQLite compatibility)
  if (typeof jsonValue === 'string') {
    try {
      const parsed = JSON.parse(jsonValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to parse JSON array:', jsonValue, error);
      return [];
    }
  }
  
  return [];
}

export function parseJsonObject(jsonValue: any): any {
  if (!jsonValue) return {};
  
  // If it's already an object (PostgreSQL JSON type)
  if (typeof jsonValue === 'object' && jsonValue !== null && !Array.isArray(jsonValue)) {
    return jsonValue;
  }
  
  // If it's a string (SQLite compatibility)
  if (typeof jsonValue === 'string') {
    try {
      const parsed = JSON.parse(jsonValue);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (error) {
      console.warn('Failed to parse JSON object:', jsonValue, error);
      return {};
    }
  }
  
  return {};
}

export function stringifyJson(data: any): string {
  try {
    return JSON.stringify(data);
  } catch {
    return '{}';
  }
}