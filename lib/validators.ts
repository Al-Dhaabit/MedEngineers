// Simple validation schemas without Zod for production compatibility

import { error } from "console";

export interface ValidationResult {
  success: boolean;
  error?: string;
  details?: string[];
  code?: string;
  data?: any;
}

// BASE FORM VALIDATION (FOR BOTH ATTENDEES AND COMPETITORS)
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
      errors.push("Emirates ID must be at least 5 characters");
    }
    if (data.emiratesID.length > 18) {
      errors.push("Emirates ID must be less than 18 characters");
    }
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// ATTENDEE SPECIFIC VALIDATION 
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
    errors.push("Major and Year of study must be at least 2 characters");
  } else if (data.major.length > 100) {
    errors.push("Major and Year of study must be less than 100 characters");
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// COMPETITOR SPECIFIC VALIDATION
export function validateCompetitorForm(data: any) {
  const baseValidation = validateBaseForm(data);
  if (!baseValidation.success) {
    return baseValidation;
  }

  // Major validation for competitors
  const errors: string[] = [];
  const validMajors = ["Engineering", "Medicine", "Healthcare"];

  if (!data.major || !validMajors.includes(data.major)) {
    errors.push("Please select a valid major category");
  }

  // University validation for competitors
  if (!data.university || typeof data.university !== 'string') {
    errors.push("University name is required");
  } else if (data.university.length < 2) {
    errors.push("University name must be at least 2 characters");
  } else if (data.university.length > 100) {
    errors.push("University name must be less than 100 characters");
  }

  // CHECK FOR ENGINEERING COMPETITORS
  if (data.major === "Engineering") {

    // majorType validation for Engineering 
    if (!data.majorType) {
      errors.push("Major type is required");
    } else if (data.majorType.length < 2) {
      errors.push("Major type must be at least 2 characters");
    } else if (data.majorType.length > 100) {
      errors.push("Major type must be less than 100 characters");
    }

    // Year validation
    const validYears = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduate"];
    if (data.year && !validYears.includes(data.year)) {
      errors.push("Invalid year selection for Engineering");
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

    // Group Validation for Engineering only
    // const group1 = ["CAD / 3D Modeling (SolidWorks, Fusion 360, etc.)",
    //   "Prototyping (3D Printing, Laser Cutting, CNC)",
    //   "Robotics / Actuators / Sensors",
    //   "PCB Design / Embedded Systems (Arduino, ESP32)"]

    // const group2 = ["Process Mapping / Flowcharting (BPMN, Lucidchart)",
    //   "Resource Optimization / Queueing Theory",
    //   "Supply Chain / Logistics Management",
    //   "Lean Six Sigma / Bottleneck Analysis",
    //   "Human Factors / Ergonomics"
    // ]

    // const group3 = ["Programming (Python, C++, Java, JavaScript)",
    //   "AI / Machine Learning / Data Science",
    //   "Computer Vision (OpenCV)",
    //   "Mobile/Web App Development"
    // ]

    // const group4 = ["Technical Writing & Documentation",
    //   "Market Research & Feasibility Analysis",
    //   "ROI / Financial Modeling",
    //   "Presentation & Pitch Deck Design"
    // ]

    // if (data.major === "Engineering") {
    //   if (!data.group1.includes(group1)) {
    //     errors.push("Please ");
    //   }
    //   if (!data.group2.includes(group2)) {
    //     errors.push("Invalid group 2 selection");
    //   }
    //   if (!data.group3.includes(group3)) {
    //     errors.push("Invalid group 3 selection");
    //   }
    //   if (!data.group4.includes(group4)) {
    //     errors.push("Invalid group 4 selection");
    //   }
    // }

    // work style validation is only for ENGINEERING and has only 3 options
    const workStyleOptions = [
      "The Builder: I am happiest when I am physically assembling something or making a motor spin.",
      "The Architect: I am happiest when I am organizing a system, finding a bottleneck, and making a process 2x faster.",
      "The Coder: I am happiest when I am training a model, debugging a script, or designing a UI.",
    ];

    if (!data.workStyle && data.workStyle.length !== '') {
      if (data.major === "Engineering") {
        if (!data.workStyle.includes(workStyleOptions)) {
          errors.push("Work style is required");
        }
      }
    }

    // Text field validations, changed max characters from 2000 to 100 as mentioned in form
    if (!data.projects && data.projects.length > 100) {
      errors.push("Projects description must be less than 100 characters");
    }

    if (!data.experience && data.experience.length > 1000) {
      errors.push("Experience description must be less than 1000 characters");
    }

    if (!data.challengeAnswer) {
      if (data.challengeAnswer.length < 10) {
        errors.push("Challenge answer must be at least 10 characters");
      } else if (data.challengeAnswer.length > 1000) {
        errors.push("Challenge answer must be less than 1000 characters");
      }
    }
  } else if (data.major === "Medicine" || data.major === "Healthcare") {

    // Major type validation for Medicine/Healthcare
    if (!data.majorType) {
      errors.push("Major type is required");
    } else if (data.majorType.length < 2) {
      errors.push("Major type must be at least 2 characters");
    } else if (data.majorType.length > 100) {
      errors.push("Major type must be less than 100 characters");
    }

    // Year validation
    const validYears = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 6+"];
    if (data.year && !validYears.includes(data.year)) {
      errors.push("Invalid year selection for Medicine/Healthcare");
    }

    // Skillset validation 
    const skillSet = [`Clinical Logic: I can spot "medical errors" in a tech solution immediately.`,
      `Evidence-Based Research: I can find the right PubMed paper in 60 seconds.`,
      `Patient Advocacy: I can represent the actual user experience of a patient.`,
      `System Mapping: I understand how hospital departments and workflows actually interact.`
    ]

    if (!data.skillSet && data.skillSet.length !== '') {
      // Apply to both Medicine and Healthcare
      if (data.major === "Medicine" || data.major === "Healthcare") {
        if (!skillSet.includes(data.skillSet)) {
          errors.push("Invalid skillset selection");
        }
      }
    }

    // URL validations (EXPERIENCE & PORTFOLIO)
    // LinkedIn validation
    if (!data.linkedIn && data.linkedIn !== '') {
      try {
        new URL(data.linkedIn);
      } catch {
        // errors.push("Invalid LinkedIn URL"); // Relaxed URL check
      }
    }

    // Resume validation
    if (!data.resume && data.resume !== '') {
      try {
        new URL(data.resume);
      } catch {
        errors.push("Invalid Resume URL");
      }
    }

    // Portfolio validation
    if (!data.googleDrive && data.googleDrive !== '') {
      errors.push("Portfolio/Personal Projects is required");
    }

    // SMARTNESS TEST 
    // challenge1
    if (!data.challenge1 && data.challenge1 !== "") {
      errors.push("Challenge 1 is required");
    }

    // challenge2
    if (!data.challenge2 && data.challenge2 !== "") {
      errors.push("Challenge 2 is required");
    }

    // enthusiasmCheck validation
    if (!data.enthusiasmCheck && data.enthusiasmCheck !== "") {
      errors.push("Enthusiasm check is required");
    }

    // collaborativeSpirit validation
    if (!data.collaborativeSpirit && data.collaborativeSpirit !== "") {
      errors.push("Collaborative spirit check is required");
    }

    // END OF VALIDATIONS
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

  let finalFormData: any;
  // Map Google Form field IDs to validation schema
  if (type === "attendee") {
    finalFormData = {
      fullName: request.responses["1706880442"],
      email: request.responses["464604082"],
      contactNo: request.responses["1329997643"],
      nationality: request.responses["492691881"],
      emiratesID: request.responses["1368274746"],
      major: request.responses["1740303904"],
    }
  } else if (type === "competitor") {
    // Map Healthcare same as Medicine
    if (request.responses["563534208"] === "Medicine" || request.responses["563534208"] === "Healthcare") {
      finalFormData = {
        fullName: request.responses["1706880442"] || "",
        email: request.responses["464604082"] || "",
        contactNo: request.responses["1329997643"] || "",
        nationality: request.responses["492691881"] || "",
        emiratesID: request.responses["1368274746"] || "",
        university: request.responses["805706027"] || "",
        major: request.responses["563534208"] || "",
        majorType: request.responses["1945900292"] || request.responses["1921732712"] || "",
        year: request.responses["257116715"] || request.responses["2106989264"] || "",
        skillSet: request.responses["697380523"] || "",
        linkedIn: request.responses["1745529891"] || "",
        resume: request.responses["2111396898"] || "",
        googleDrive: request.responses["934276771"] || "",
        challenge1: request.responses["1644031809"] || "",
        challenge2: request.responses["1176839290"] || "",
        enthusiasmCheck: request.responses["1213229623"] || "",
        collaborativeSpirit: request.responses["1628051962"] || "",
      }
    } else if (request.responses["563534208"] === "Engineering") {
      finalFormData = {
        fullName: request.responses["1706880442"],
        email: request.responses["464604082"],
        contactNo: request.responses["1329997643"],
        nationality: request.responses["492691881"],
        emiratesID: request.responses["1368274746"],
        university: request.responses["805706027"],
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
      }
    } else {
      // Reject any other major immediately
      return {
        success: false,
        error: "Invalid major. Competitors must be Medicine, Healthcare, or Engineering.",
        code: "INVALID_MAJOR"
      };
    }
  }

  // 4. Run Sub-Validators
  const validation = type === "attendee"
    ? validateAttendeeForm(finalFormData)
    : validateCompetitorForm(finalFormData);

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
      formData: finalFormData
    }
  };
}
