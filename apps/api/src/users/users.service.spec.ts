import { usernameFromDisplayName } from './users.service.js';

describe('usernameFromDisplayName', () => {
  it('removes Vietnamese accents, spaces, uppercase, and special characters', () => {
    expect(usernameFromDisplayName('Đặng Thị Ánh!')).toBe('dangthianh');
  });

  it('limits generated usernames to 30 characters', () => {
    expect(usernameFromDisplayName('A'.repeat(40))).toBe('a'.repeat(30));
  });

  it('uses a valid fallback when the display name has no usable characters', () => {
    expect(usernameFromDisplayName('✨')).toBe('user');
    expect(usernameFromDisplayName('An')).toBe('user');
  });
});
