import { type Variable } from '../../types';

interface ValidationResult {
  isValid: boolean;
  error?: string;
  missingVariables?: string[];
  unusedVariables?: string[];
}

export const validateTemplate = (
  html: string,
  variables: Record<string, Variable>
): ValidationResult => {
  // Extract all variables from the template
  const variableRegex = /{{([^}]+)}}/g;
  const matches = html.match(variableRegex) || [];
  const usedVariables = matches.map((match) => match.slice(2, -2).trim());

  // Check for missing variables (used in template but not defined)
  const missingVariables = usedVariables.filter(
    (variable) => !variables[variable]
  );

  // Check for unused variables (defined but not used in template)
  const unusedVariables = Object.keys(variables).filter(
    (variable) => !usedVariables.includes(variable)
  );

  // Check for required variables
  const missingRequiredVariables = Object.entries(variables)
    .filter(([name, variable]) => variable.required && !usedVariables.includes(name))
    .map(([name]) => name);

  if (missingVariables.length > 0) {
    return {
      isValid: false,
      error: `Template contains undefined variables: ${missingVariables.join(', ')}`,
      missingVariables,
      unusedVariables,
    };
  }

  if (missingRequiredVariables.length > 0) {
    return {
      isValid: false,
      error: `Template is missing required variables: ${missingRequiredVariables.join(
        ', '
      )}`,
      missingVariables,
      unusedVariables,
    };
  }

  // Check for malformed variable syntax
  const malformedRegex = /{[^{]|[^}]}/g;
  const malformedMatches = html.match(malformedRegex);
  if (malformedMatches) {
    return {
      isValid: false,
      error: 'Template contains malformed variable syntax',
      missingVariables,
      unusedVariables,
    };
  }

  return {
    isValid: true,
    missingVariables,
    unusedVariables,
  };
}; 