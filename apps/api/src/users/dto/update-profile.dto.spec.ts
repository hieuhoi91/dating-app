import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto.js';

describe('UpdateProfileDto username', () => {
  it.each(['minh123', 'abc'])('accepts normalized username %s', async (username) => {
    const errors = await validate(
      plainToInstance(UpdateProfileDto, { username }),
    );
    expect(errors).toHaveLength(0);
  });

  it.each(['Minh', 'minh anh', 'minh_anh', 'minh-anh', 'minhá'])(
    'rejects username that is not lowercase ASCII alphanumeric: %s',
    async (username) => {
      const errors = await validate(
        plainToInstance(UpdateProfileDto, { username }),
      );
      expect(errors.some((error) => error.property === 'username')).toBe(true);
    },
  );
});
