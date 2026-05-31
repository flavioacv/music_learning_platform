export function success<T>(data: T) {
  return { data };
}

export function failure(code: string, message: string) {
  return {
    error: {
      code,
      message,
    },
  };
}
