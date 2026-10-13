
export interface WeightRecord {
  id: number
  entry_date: string
  weight_kg: number | string
  created_at: string
}

export interface WorkoutRecord {
  id: number
  workout_date: string
  workout_name: string
  duration_minutes: number
  status: 'planned' | 'completed' | 'missed'
  created_at: string
}

export interface DashboardSummary {
  latest_weight: WeightRecord | null
  total_workouts: number
  completed_workouts: number
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  getWeights: () => request<WeightRecord[]>('/weights'),

  addWeight: (entry: { entry_date: string; weight_kg: number }) =>
    request<{ message: string; entry: WeightRecord }>('/weights', {
      method: 'POST',
      body: JSON.stringify(entry),
    }),

  getWorkouts: () => request<WorkoutRecord[]>('/workouts'),

  addWorkout: (entry: {
    workout_date: string
    workout_name: string
    duration_minutes: number
    status: 'planned' | 'completed' | 'missed'
  }) =>
    request<{ message: string; entry: WorkoutRecord }>('/workouts', {
      method: 'POST',
      body: JSON.stringify(entry),
    }),


  updateWorkoutStatus: (
    id: number,
    status: 'planned' | 'completed' | 'missed',
  ) =>
    request<{ message: string; entry: WorkoutRecord }>(
      `/workouts/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
    ),

  getDashboard: () => request<DashboardSummary>('/dashboard'),


}

