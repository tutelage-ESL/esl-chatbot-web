type EnvVars = {

  BASE_URL: string;
};

export default function useEnv(): EnvVars {
  return {
    BASE_URL: import.meta.env.BASE_URL
  };
}
