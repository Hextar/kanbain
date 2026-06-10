import HabitHeader from './Habit/HabitHeader'
import HabitForm from './Habit/HabitForm'
import HabitList from './Habit/HabitList'
import { HabitProvider } from './Habit/context/HabitProvider';
import TimerangeProvider from './Habit/context/TimerangeProvider';

export default function App() {
  return <div className="w-full max-w-screen-md mx-auto flex flex-col items-center justify-center">
    <HabitProvider>
      <TimerangeProvider>
        <HabitHeader className="w-full"/>
        <HabitForm className="w-full" />
        <HabitList className="w-full" />
      </TimerangeProvider>
    </HabitProvider>
  </div>;
}