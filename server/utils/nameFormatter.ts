/**
 * Utility function to format names in proper case
 * First letter of each word in uppercase, rest in lowercase
 * Except for specific prefixes like "da", "de", "do", "das", "dos", "e"
 */

const LOWERCASE_PREFIXES = [
  'da', 'de', 'do', 'das', 'dos', 'e',
  'a', 'o', 'as', 'os',
  'em', 'na', 'no', 'nas', 'nos',
  'com', 'para', 'por'
];

/**
 * Formats a name according to Brazilian naming conventions
 * - First letter of each word capitalized
 * - Rest in lowercase
 * - Specific prefixes kept in lowercase (da, de, do, etc.)
 *
 * @param name - The name to format
 * @returns The formatted name
 *
 * @example
 * formatName('MARIA DA SILVA') // Returns: 'Maria da Silva'
 * formatName('joão de oliveira') // Returns: 'João de Oliveira'
 * formatName('PEDRO E MARIA') // Returns: 'Pedro e Maria'
 */
export function formatName(name: string | null | undefined): string {
  if (!name) return '';

  // Trim and normalize spaces
  const normalized = name.trim().replace(/\s+/g, ' ');

  // Split into words
  const words = normalized.toLowerCase().split(' ');

  // Format each word
  const formattedWords = words.map((word, index) => {
    // Empty word, skip
    if (!word) return '';

    // First word should always be capitalized
    if (index === 0) {
      return capitalizeWord(word);
    }

    // Check if it's a prefix that should stay lowercase
    if (LOWERCASE_PREFIXES.includes(word.toLowerCase())) {
      return word.toLowerCase();
    }

    // Otherwise, capitalize
    return capitalizeWord(word);
  });

  return formattedWords.join(' ');
}

/**
 * Capitalizes the first letter of a word
 */
function capitalizeWord(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Formats full name by splitting first and last name
 * and applying proper formatting
 *
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Object with formatted first and last names
 */
export function formatFullName(firstName?: string | null, lastName?: string | null): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  const formattedFirstName = formatName(firstName);
  const formattedLastName = formatName(lastName);

  const fullName = [formattedFirstName, formattedLastName]
    .filter(Boolean)
    .join(' ');

  return {
    firstName: formattedFirstName,
    lastName: formattedLastName,
    fullName
  };
}
