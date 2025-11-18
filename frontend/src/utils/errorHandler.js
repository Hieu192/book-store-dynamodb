/**
 * Extract error message from error object
 * @param {*} error - Error object or string
 * @returns {string} - Error message string
 */
export const getErrorMessage = (error) => {
  // If error is already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If error is an object with message property
  if (error && typeof error === 'object') {
    // Check for response.data.message (Axios error)
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    // Check for message property
    if (error.message) {
      return error.message;
    }
    
    // Check for error property
    if (error.error) {
      return typeof error.error === 'string' ? error.error : 'Đã xảy ra lỗi';
    }
  }

  // Default error message
  return 'Đã xảy ra lỗi. Vui lòng thử lại!';
};

/**
 * Display error alert
 * @param {*} alert - Alert instance from react-alert
 * @param {*} error - Error object or string
 */
export const showErrorAlert = (alert, error) => {
  const message = getErrorMessage(error);
  alert.error(message);
};
