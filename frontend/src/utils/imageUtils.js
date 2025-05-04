/**
 * Utility functions for handling image URLs in the application
 */

// Get the API base URL from environment or use default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Converts a relative image URL to an absolute URL
 * @param {string} imageUrl - The image URL from the backend
 * @returns {string} - The absolute URL for the image
 */
export const getFullImageUrl = (imageUrl) => {
  if (!imageUrl) return '';
  
  // If it's already an absolute URL, return it as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If it's a relative URL starting with /media/, add the API base URL
  if (imageUrl.startsWith('/media/')) {
    return `${API_BASE_URL}${imageUrl}`;
  }
  
  // If it doesn't start with /, add it
  if (!imageUrl.startsWith('/')) {
    return `${API_BASE_URL}/${imageUrl}`;
  }
  
  // Otherwise, just add the API base URL
  return `${API_BASE_URL}${imageUrl}`;
};
