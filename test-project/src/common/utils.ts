export const utility = "";

type Partial<T> = {
  [P in keyof T]?: T[P];
};
