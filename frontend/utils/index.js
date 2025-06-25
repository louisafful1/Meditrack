export const validateEmail = (email) => {
    // Regular expression pattern for validating an email
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // Test the input email against the pattern
    return emailPattern.test(email);
  }