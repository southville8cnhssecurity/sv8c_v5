import bcrypt from 'bcryptjs';

/**
 * Username = adviser's name, uppercased, periods preserved on initials.
 * "Khent A. Ten" -> "KHENT A. TEN"
 * Caller is responsible for checking uniqueness and disambiguating
 * (e.g. appending grade level) if two advisers share an identical name.
 */
export function formatAdviserUsername(classAdviser: string): string {
  return classAdviser.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Password = section name, uppercased.
 * TESTING PHASE ONLY — accepted risk, see migration_v6.sql notes.
 */
export function formatSectionPassword(sectionName: string): string {
  return sectionName.trim().toUpperCase();
}

export async function hashSectionPassword(sectionName: string): Promise<string> {
  return bcrypt.hash(formatSectionPassword(sectionName), 12);
}