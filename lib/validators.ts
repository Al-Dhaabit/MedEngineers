// Simple validation schemas without Zod for production compatibility

export interface ValidationResult {
  success: boolean;
  error?: string;
  details?: string[];
  code?: string;
  data?: any;
}

// Base form validation
export function validateBaseForm(data: any) {
  const errors: string[] = [];

  // Full name validation
  if (!data.fullName || typeof data.fullName !== 'string') {
    errors.push("Full name is required");
  } else if (data.fullName.length < 2) {
    errors.push("Full name must be at least 2 characters");
  } else if (data.fullName.length > 100) {
    errors.push("Full name must be less than 100 characters");
  } else if (!/^[a-zA-Z\s'-]+$/.test(data.fullName)) {
    errors.push("Full name can only contain letters, spaces, hyphens, and apostrophes");
  }

  // Email validation
  if (!data.email || typeof data.email !== 'string') {
    errors.push("Email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Invalid email address");
  } else if (data.email.length > 254) {
    errors.push("Email must be less than 254 characters");
  }

  // Phone validation
  // Validates against strict regex, relax this to allow spaces/dashes
  if (data.contactNo && !/^[0-9+\-\s()]+$/.test(data.contactNo)) {
    errors.push("Invalid phone number format");
  }

  // Nationality validation
  if (!data.nationality || typeof data.nationality !== 'string') {
    errors.push("Nationality is required");
  } else if (data.nationality.length < 2) {
    errors.push("Nationality must be at least 2 characters");
  } else if (data.nationality.length > 50) {
    errors.push("Nationality must be less than 50 characters");
  }

  // Emirates ID / Passport validation
  if (data.emiratesID) {
    if (String(data.emiratesID).length < 5) {
      errors.push("ID must be at least 5 characters");
    }
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Attendee specific validation
export function validateAttendeeForm(data: any) {
  const baseValidation = validateBaseForm(data);
  if (!baseValidation.success) {
    return baseValidation;
  }

  const errors: string[] = [];

  // Major validation for attendees
  if (!data.major || typeof data.major !== 'string') {
    errors.push("Major is required");
  } else if (data.major.length < 2) {
    errors.push("Major must be at least 2 characters");
  } else if (data.major.length > 100) {
    errors.push("Major must be less than 100 characters");
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Competitor specific validation
export function validateCompetitorForm(data: any) {
  const baseValidation = validateBaseForm(data);
  if (!baseValidation.success) {
    return baseValidation;
  }

  const errors: string[] = [];
  const validMajors = ["Engineering", "Business", "Medicine", "Science", "Other"];

  // Major validation for competitors
  if (!data.major || !validMajors.includes(data.major)) {
    errors.push("Please select a valid major category");
  }

  // Year validation
  const validYears = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate", "Other", "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "6th Year", "Intern", "Internship"];
  if (data.year && !validYears.includes(data.year)) {
    errors.push("Invalid year selection");
  }

  // URL validations
  if (data.linkedIn && data.linkedIn !== '') {
    try {
      new URL(data.linkedIn);
    } catch {
      // errors.push("Invalid LinkedIn URL"); // Relaxed URL check
    }
  }

  if (data.googleDrive && data.googleDrive !== '') {
    try {
      new URL(data.googleDrive);
    } catch {
      errors.push("Invalid Google Drive URL");
    }
  }

  // Text field validations
  if (data.workStyle && data.workStyle.length > 500) {
    errors.push("Work style description must be less than 500 characters");
  }

  if (data.projects && data.projects.length > 2000) {
    errors.push("Projects description must be less than 2000 characters");
  }

  if (data.experience && data.experience.length > 2000) {
    errors.push("Experience description must be less than 2000 characters");
  }

  if (data.challengeAnswer) {
    if (data.challengeAnswer.length < 10) {
      errors.push("Challenge answer must be at least 10 characters");
    } else if (data.challengeAnswer.length > 1000) {
      errors.push("Challenge answer must be less than 1000 characters");
    }
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Main validation function for form submissions
export function validateFormSubmission(data: unknown, type: "attendee" | "competitor"): ValidationResult {
  // Basic request validation
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      error: "Invalid request format",
      code: "INVALID_REQUEST"
    };
  }

  const request = data as any;

  // Validate required fields
  if (!request.responses || typeof request.responses !== 'object') {
    return {
      success: false,
      error: "Responses are required",
      code: "MISSING_RESPONSES"
    };
  }

  if (!request.type || !["attendee", "competitor"].includes(request.type)) {
    return {
      success: false,
      error: "Invalid form type",
      code: "INVALID_TYPE"
    };
  }

  if (!request.idToken || typeof request.idToken !== 'string') {
    return {
      success: false,
      error: "ID token is required",
      code: "MISSING_TOKEN"
    };
  }

  // Map Google Form field IDs to validation schema
  const formData = {
    fullName: request.responses["1706880442"],
    email: request.responses["464604082"],
    contactNo: request.responses["1329997643"],
    nationality: request.responses["492691881"],
    emiratesID: request.responses["1368274746"],
    ...(request.type === "attendee" ? {
      major: request.responses["1740303904"],
    } : {
      major: request.responses["563534208"],
      majorType: request.responses["1921732712"] || request.responses["1945900292"], // Updated ID logic
      year: request.responses["2106989264"] || request.responses["257116715"], // Check both IDs
      linkedIn: request.responses["1706787055"],
      googleDrive: request.responses["979885116"],
      group1: request.responses["2005954606"],
      group2: request.responses["909777607"],
      group3: request.responses["1618805851"],
      group4: request.responses["342956899"],
      workStyle: request.responses["1475281755"],
      projects: request.responses["1889236055"],
      experience: request.responses["913830966"],
      challengeAnswer: request.responses["1822551769"],
    })
  };

  // Validate based on form type
  const validation = request.type === "attendee"
    ? validateAttendeeForm(formData)
    : validateCompetitorForm(formData);

  if (!validation.success) {
    return {
      success: false,
      error: "Invalid form data",
      details: validation.errors,
      code: "INVALID_FORM_DATA"
    };
  }

  return {
    success: true,
    data: {
      request: request,
      formData: formData
    }
  };
}
