import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleX,
  Dumbbell,
  Footprints,
  LayoutDashboard,
  Plus,
  Scale,
  Target,
  Trophy,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from './services/api'
import type {
  DashboardSummary,
  WeightRecord,
  WorkoutRecord,
} from './services/api'
import './App.css'

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Weight Tracking', icon: Scale },
  { label: 'Workout Planner', icon: CalendarDays },
  { label: 'Exercises', icon: Dumbbell },
]

type WorkoutFilter = 'all' | 'planned' | 'completed' | 'missed'

function App() {
  const [weights, setWeights] = useState<WeightRecord[]>([])
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([])
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)

  const [weight, setWeight] = useState('')
  const [activeNav, setActiveNav] = useState('Dashboard')

  const [showWeightForm, setShowWeightForm] = useState(false)
  const [showWorkoutForm, setShowWorkoutForm] = useState(false)

  const [workoutName, setWorkoutName] = useState('')
  const [workoutDate, setWorkoutDate] = useState(
    new Date().toLocaleDateString('en-CA'),
  )
  const [workoutDuration, setWorkoutDuration] = useState('60')
  const [workoutFilter, setWorkoutFilter] = useState<WorkoutFilter>('all')

  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingWorkout, setSavingWorkout] = useState(false)
  const [updatingWorkoutId, setUpdatingWorkoutId] = useState<number | null>(
    null,
  )

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [weightData, workoutData, dashboardData] = await Promise.all([
        api.getWeights(),
        api.getWorkouts(),
        api.getDashboard(),
      ])

      setWeights(weightData)
      setWorkouts(workoutData)
      setDashboard(dashboardData)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load GymTrack data.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function saveWeight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedWeight = Number(weight)

    if (
      !Number.isFinite(parsedWeight) ||
      parsedWeight <= 0 ||
      parsedWeight > 500
    ) {
      setError('Enter a valid weight between 0 and 500 kg.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    try {
      await api.addWeight({
        entry_date: new Date().toLocaleDateString('en-CA'),
        weight_kg: parsedWeight,
      })

      setWeight('')
      setShowWeightForm(false)
      setNotice('Weight saved to PostgreSQL successfully.')
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save weight.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function saveWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const duration = Number(workoutDuration)

    if (!workoutName.trim()) {
      setError('Enter a workout name.')
      return
    }

    if (!workoutDate) {
      setError('Select a workout date.')
      return
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 600) {
      setError('Duration must be between 1 and 600 minutes.')
      return
    }

    setSavingWorkout(true)
    setError('')
    setNotice('')

    try {
      await api.addWorkout({
        workout_date: workoutDate,
        workout_name: workoutName.trim(),
        duration_minutes: duration,
        status: 'planned',
      })

      setWorkoutName('')
      setWorkoutDate(new Date().toLocaleDateString('en-CA'))
      setWorkoutDuration('60')
      setShowWorkoutForm(false)
      setWorkoutFilter('all')
      setNotice('Workout saved successfully.')
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save workout.',
      )
    } finally {
      setSavingWorkout(false)
    }
  }

  async function changeWorkoutStatus(
    workoutId: number,
    status: 'planned' | 'completed' | 'missed',
  ) {
    setError('')
    setNotice('')
    setUpdatingWorkoutId(workoutId)

    try {
      await api.updateWorkoutStatus(workoutId, status)
      setNotice(`Workout status changed to ${status}.`)
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not update workout status.',
      )
    } finally {
      setUpdatingWorkoutId(null)
    }
  }

  const latestWeight = dashboard?.latest_weight
    ? Number(dashboard.latest_weight.weight_kg)
    : null

  const chartData = [...weights]
    .sort(
      (a, b) =>
        a.entry_date.localeCompare(b.entry_date) || a.id - b.id,
    )
    .map((record) => ({
      date: record.entry_date,
      weight: Number(record.weight_kg),
    }))

  const completedWorkouts = dashboard?.completed_workouts ?? 0
  const totalWorkouts = dashboard?.total_workouts ?? 0

  const plannedWorkouts = workouts.filter(
    (item) => item.status === 'planned',
  ).length

  const activeMinutes = workouts
    .filter((item) => item.status === 'completed')
    .reduce((sum, item) => sum + item.duration_minutes, 0)

  const upcomingWorkout = [...workouts]
    .filter((workout) => workout.status === 'planned')
    .sort((a, b) => a.workout_date.localeCompare(b.workout_date))[0]

  const filteredWorkouts = [...workouts]
    .filter(
      (workout) =>
        workoutFilter === 'all' || workout.status === workoutFilter,
    )
    .sort((a, b) => {
      const dateOrder = b.workout_date.localeCompare(a.workout_date)
      return dateOrder || b.id - a.id
    })

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Activity size={22} />
          </div>
          <span>
            GymTrack<span className="brand-dot">.</span>
          </span>
        </div>

        <p className="nav-caption">WORKSPACE</p>

        <nav className="nav-list">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              className={`nav-item ${
                activeNav === label ? 'active' : ''
              }`}
              key={label}
              onClick={() => setActiveNav(label)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === 'Workout Planner' && (
                <span className="nav-count">{workouts.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-goal">
          <div className="goal-icon">
            <Target size={20} />
          </div>
          <p className="goal-title">Stay consistent</p>
          <p className="goal-copy">
            Small steps every day lead to big results.
          </p>
          <div className="goal-progress">
            <span />
          </div>
          <p className="goal-foot">Your fitness journey, your pace.</p>
        </div>

        <button
          className="profile-button"
          onClick={() =>
            setNotice('Profile settings will be added later.')
          }
        >
          <div className="avatar">V</div>
          <div className="profile-text">
            <strong>Vanji</strong>
            <span>Fitness journey</span>
          </div>
          <ChevronDown size={17} />
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              {new Date()
                .toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
                .toUpperCase()}
            </p>
            <h1>
              {activeNav === 'Dashboard'
                ? 'Your fitness dashboard'
                : activeNav}
            </h1>
            <p className="page-subtitle">
              Every rep counts. Keep building your best self.
            </p>
          </div>

          <button
            className="date-button"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <CalendarDays size={17} />
            Refresh data
            <ChevronDown size={15} />
          </button>
        </header>

        {error && (
          <div className="notice error-notice" role="alert">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button
              onClick={() => setNotice('')}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}

        {loading && (
          <p className="page-subtitle">
            Loading your saved fitness data…
          </p>
        )}

        {activeNav === 'Dashboard' && (
          <>
            <section className="stats-grid" aria-label="Fitness summary">
              <article className="stat-card">
                <div className="stat-top">
                  <span>Current weight</span>
                  <div className="stat-icon purple">
                    <Scale size={19} />
                  </div>
                </div>
                <div className="stat-value">
                  {latestWeight === null ? '—' : latestWeight.toFixed(1)}{' '}
                  <small>kg</small>
                </div>
                <div className="stat-foot neutral">
                  <Activity size={15} />
                  <span>Latest saved entry</span>
                </div>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>Workouts completed</span>
                  <div className="stat-icon orange">
                    <Dumbbell size={19} />
                  </div>
                </div>
                <div className="stat-value">
                  {completedWorkouts} <small>total completed</small>
                </div>
                <div className="stat-foot neutral">
                  <Activity size={15} />
                  <span>{totalWorkouts} recorded workouts</span>
                </div>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>Active minutes</span>
                  <div className="stat-icon blue">
                    <Footprints size={19} />
                  </div>
                </div>
                <div className="stat-value">
                  {activeMinutes} <small>min</small>
                </div>
                <div className="stat-foot neutral">
                  <Activity size={15} />
                  <span>From completed workouts</span>
                </div>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>Planned workouts</span>
                  <div className="stat-icon green">
                    <Trophy size={19} />
                  </div>
                </div>
                <div className="stat-value">
                  {plannedWorkouts} <small>planned</small>
                </div>
                <div className="stat-foot neutral">
                  <CalendarDays size={15} />
                  <span>Upcoming sessions</span>
                </div>
              </article>
            </section>

            <section className="content-grid">
              <article className="panel weight-panel">
                <div className="panel-header">
                  <div>
                    <h2>Weight progress</h2>
                    <p>History from your saved entries</p>
                  </div>
                  <button
                    className="outline-button"
                    onClick={() => setShowWeightForm(!showWeightForm)}
                  >
                    <Plus size={16} />
                    Log weight
                  </button>
                </div>

                {showWeightForm && (
                  <form className="weight-form" onSubmit={saveWeight}>
                    <label htmlFor="weight">Today's weight (kg)</label>
                    <input
                      id="weight"
                      type="number"
                      min="0.01"
                      max="500"
                      step="0.01"
                      value={weight}
                      onChange={(event) => setWeight(event.target.value)}
                      placeholder="Enter weight in kg"
                      required
                    />
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Save weight'}
                    </button>
                  </form>
                )}

                <div className="chart-container">
                  {chartData.length === 0 ? (
                    <p className="page-subtitle">
                      Log your first weight entry to see your progress.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={chartData}>
                        <CartesianGrid
                          stroke="#edf0f5"
                          strokeDasharray="4 4"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#8991a3', fontSize: 12 }}
                        />
                        <YAxis
                          domain={['dataMin - 0.5', 'dataMax + 0.5']}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#8991a3', fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value) => [`${value} kg`, 'Weight']}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="#7256df"
                          strokeWidth={3}
                          dot={{
                            r: 4,
                            fill: '#7256df',
                            strokeWidth: 2,
                            stroke: '#fff',
                          }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="chart-legend">
                  <span />
                  Weight in kilograms
                </div>
              </article>

              <article className="panel workout-panel">
                <div className="panel-header">
                  <div>
                    <h2>Workout overview</h2>
                    <p>From your saved workout records</p>
                  </div>
                  <span className="planned-badge">
                    {upcomingWorkout ? 'Planned' : 'Up to date'}
                  </span>
                </div>

                {upcomingWorkout ? (
                  <>
                    <div className="workout-art">
                      <Dumbbell size={35} />
                      <span>UP NEXT</span>
                    </div>
                    <h3>{upcomingWorkout.workout_name}</h3>
                    <p className="workout-description">
                      Your next planned training session.
                    </p>
                    <div className="workout-meta">
                      <span>
                        <Activity size={16} />{' '}
                        {upcomingWorkout.duration_minutes} minutes
                      </span>
                      <span>
                        <CalendarDays size={16} />{' '}
                        {upcomingWorkout.workout_date}
                      </span>
                    </div>
                    <button
                      className="primary-button full-width"
                      onClick={() =>
                        void changeWorkoutStatus(
                          upcomingWorkout.id,
                          'completed',
                        )
                      }
                      disabled={updatingWorkoutId === upcomingWorkout.id}
                    >
                      {updatingWorkoutId === upcomingWorkout.id
                        ? 'Updating…'
                        : 'Mark completed ✓'}
                    </button>
                  </>
                ) : (
                  <div className="workout-empty">
                    <Dumbbell size={30} />
                    <h3>No planned workout</h3>
                    <p className="workout-description">
                      Your planned sessions will appear here.
                    </p>
                  </div>
                )}

                <div className="workout-meta">
                  <span>
                    <Trophy size={16} /> {completedWorkouts} completed
                  </span>
                  <span>
                    <CalendarDays size={16} /> {totalWorkouts} total
                  </span>
                </div>
                <button
                  className="primary-button full-width"
                  onClick={() => setActiveNav('Workout Planner')}
                >
                  View workouts <span>→</span>
                </button>
              </article>
            </section>

            <section className="panel weekly-panel">
              <div className="panel-header">
                <div>
                  <h2>Recent weight entries</h2>
                  <p>Your most recent saved measurements.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => void loadData()}
                  disabled={loading}
                >
                  Refresh →
                </button>
              </div>

              {weights.length === 0 ? (
                <p className="page-subtitle">No entries to display.</p>
              ) : (
                <div className="recent-entries">
                  {[...weights]
                    .sort(
                      (a, b) =>
                        b.entry_date.localeCompare(a.entry_date) ||
                        b.id - a.id,
                    )
                    .slice(0, 5)
                    .map((record) => (
                      <div className="recent-entry" key={record.id}>
                        <div className="recent-entry-icon">
                          <Scale size={17} />
                        </div>
                        <div className="recent-entry-date">
                          <strong>{record.entry_date}</strong>
                          <span>Weight measurement</span>
                        </div>
                        <div className="recent-entry-weight">
                          {Number(record.weight_kg).toFixed(1)} kg
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeNav === 'Workout Planner' && (
          <section className="panel planner-panel">
            <div className="panel-header">
              <div>
                <h2>Your workout sessions</h2>
                <p>Create, track, and update your workouts.</p>
              </div>
              <button
                className="primary-button"
                onClick={() => setShowWorkoutForm(!showWorkoutForm)}
              >
                <Plus size={16} />
                {showWorkoutForm ? 'Close form' : 'Add workout'}
              </button>
            </div>

            {showWorkoutForm && (
              <form className="weight-form workout-form" onSubmit={saveWorkout}>
                <label htmlFor="workout-name">Workout name</label>
                <input
                  id="workout-name"
                  value={workoutName}
                  onChange={(event) => setWorkoutName(event.target.value)}
                  placeholder="e.g. Chest and Triceps"
                  maxLength={100}
                  required
                />

                <label htmlFor="workout-date">Workout date</label>
                <input
                  id="workout-date"
                  type="date"
                  value={workoutDate}
                  onChange={(event) => setWorkoutDate(event.target.value)}
                  required
                />

                <label htmlFor="workout-duration">Duration (minutes)</label>
                <input
                  id="workout-duration"
                  type="number"
                  min="1"
                  max="600"
                  step="1"
                  value={workoutDuration}
                  onChange={(event) =>
                    setWorkoutDuration(event.target.value)
                  }
                  required
                />

                <button
                  className="primary-button"
                  type="submit"
                  disabled={savingWorkout}
                >
                  {savingWorkout ? 'Saving workout…' : 'Save workout'}
                </button>
              </form>
            )}

            <div className="planner-filters" aria-label="Filter workouts">
              {(['all', 'planned', 'completed', 'missed'] as const).map(
                (filter) => (
                  <button
                    key={filter}
                    className={`filter-button ${
                      workoutFilter === filter ? 'active' : ''
                    }`}
                    onClick={() => setWorkoutFilter(filter)}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    {filter === 'all'
                      ? ` (${workouts.length})`
                      : ` (${workouts.filter((w) => w.status === filter).length})`}
                  </button>
                ),
              )}
            </div>

            {filteredWorkouts.length === 0 ? (
              <div className="workout-empty">
                <Dumbbell size={30} />
                <h3>No workouts found</h3>
                <p className="workout-description">
                  Add a workout or select another status filter.
                </p>
              </div>
            ) : (
              <div className="planner-list">
                {filteredWorkouts.map((workout) => (
                  <article className="planner-workout" key={workout.id}>
                    <div className="planner-workout-icon">
                      <Dumbbell size={22} />
                    </div>

                    <div className="planner-workout-info">
                      <h3>{workout.workout_name}</h3>
                      <p>
                        <CalendarDays size={15} />
                        {workout.workout_date}
                        <span>·</span>
                        <Activity size={15} />
                        {workout.duration_minutes} minutes
                      </p>
                    </div>

                    <span className={`status-pill ${workout.status}`}>
                      {workout.status}
                    </span>

                    <div className="planner-actions">
                      {workout.status !== 'completed' && (
                        <button
                          className="status-action complete-action"
                          title="Mark completed"
                          aria-label={`Mark ${workout.workout_name} completed`}
                          disabled={updatingWorkoutId === workout.id}
                          onClick={() =>
                            void changeWorkoutStatus(
                              workout.id,
                              'completed',
                            )
                          }
                        >
                          <CheckCircle2 size={17} />
                          Complete
                        </button>
                      )}

                      {workout.status !== 'missed' && (
                        <button
                          className="status-action missed-action"
                          title="Mark missed"
                          aria-label={`Mark ${workout.workout_name} missed`}
                          disabled={updatingWorkoutId === workout.id}
                          onClick={() =>
                            void changeWorkoutStatus(workout.id, 'missed')
                          }
                        >
                          <CircleX size={17} />
                          Missed
                        </button>
                      )}

                      {workout.status !== 'planned' && (
                        <button
                          className="status-action"
                          disabled={updatingWorkoutId === workout.id}
                          onClick={() =>
                            void changeWorkoutStatus(workout.id, 'planned')
                          }
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeNav === 'Weight Tracking' && (
          <section className="panel planner-panel">
            <div className="panel-header">
              <div>
                <h2>Weight tracking</h2>
                <p>Review your saved weight entries.</p>
              </div>
              <button
                className="primary-button"
                onClick={() => setActiveNav('Dashboard')}
              >
                Back to dashboard
              </button>
            </div>

            <button
              className="outline-button"
              onClick={() => setShowWeightForm(!showWeightForm)}
            >
              <Plus size={16} />
              Log weight
            </button>

            {showWeightForm && (
              <form className="weight-form" onSubmit={saveWeight}>
                <label htmlFor="weight-planner">Today's weight (kg)</label>
                <input
                  id="weight-planner"
                  type="number"
                  min="0.01"
                  max="500"
                  step="0.01"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  required
                />
                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save weight'}
                </button>
              </form>
            )}

            <div className="planner-list">
              {[...weights]
                .sort(
                  (a, b) =>
                    b.entry_date.localeCompare(a.entry_date) || b.id - a.id,
                )
                .map((record) => (
                  <article className="planner-workout" key={record.id}>
                    <div className="planner-workout-icon">
                      <Scale size={22} />
                    </div>
                    <div className="planner-workout-info">
                      <h3>{Number(record.weight_kg).toFixed(2)} kg</h3>
                      <p>{record.entry_date}</p>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        )}

        {activeNav === 'Exercises' && (
          <section className="panel planner-panel">
            <h2>Exercises</h2>
            <p className="page-subtitle">
              Exercise libraries, sets, reps, and rest timers will be added in
              the next development stage.
            </p>
          </section>
        )}

        <footer className="app-footer">
          <span>
            <span className="footer-dot" />
            {error
              ? 'Check your API connection.'
              : 'Connected to your GymTrack API.'}
          </span>
        </footer>
      </main>
    </div>
  )
}

export default App
