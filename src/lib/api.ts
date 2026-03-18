import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function everApplyApi<T>(
  path: string,
  getToken: () => Promise<string | null>,
  options: Parameters<typeof axiosInstance.request>[0] = {},
): Promise<T> {
  const token = await getToken()

  const res = await axiosInstance.request<T>({
    url: path,
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  return res.data
}
