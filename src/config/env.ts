const readOptional = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

export const env = {
  baseUrl: readOptional('BASE_URL'),
  username: readOptional('USERNAME'),
  password: readOptional('PASSWORD'),
};
