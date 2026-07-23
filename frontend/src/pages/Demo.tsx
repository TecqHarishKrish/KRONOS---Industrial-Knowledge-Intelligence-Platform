import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Activity, 
  CheckCircle, 
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface PredefinedQuestion {
  id: number;
  category: string;
  question: string;
}

interface PlaybackEvent {
  date: string;
  state: string;
  title: string;
  desc: string;
}

const Demo: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<PredefinedQuestion[]>([]);
  const [playbackEquipment, setPlaybackEquipment] = useState<string>('PUMP-07');
  const [events, setEvents] = useState<PlaybackEvent[]>([]);
  const [currentEventIdx, setCurrentEventIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [seedSuccess, setSeedSuccess] = useState<string>('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchQuestions();
    fetchPlaybackEvents(playbackEquipment);
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/v1/demo/questions', { headers });
      setQuestions(res.data);
    } catch (err: any) {
      console.error('Failed to fetch tour questions');
    }
  };

  const fetchPlaybackEvents = async (name: string) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/v1/demo/playback/${name}`, { headers });
      setEvents(res.data.events);
      setCurrentEventIdx(0);
      setIsPlaying(false);
    } catch (err: any) {
      console.error('Failed to fetch playback events');
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentEventIdx((prev) => {
          if (prev < events.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 2500); // Step every 2.5 seconds
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, events]);

  const handleEquipmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setPlaybackEquipment(name);
    fetchPlaybackEvents(name);
  };

  const handleResetDatabase = async () => {
    try {
      setSeeding(true);
      setSeedSuccess('');
      await axios.post('http://localhost:8000/api/v1/demo/reset', {}, { headers });
      setSeedSuccess('Database successfully reset and seeded with standard KRONOS V2 files!');
      setSeeding(false);
      setTimeout(() => setSeedSuccess(''), 5000);
    } catch (err: any) {
      setSeeding(false);
      alert('Failed to reset database');
    }
  };

  const askQuestion = (q: string) => {
    // Navigate to Chat page and pass the question as state
    navigate('/assistant', { state: { prefilledQuestion: q } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Hackathon Demo Tour Workspace
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          Interactive guided walkthrough, lifecycle playback scrubbers, and quick database resets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Reset & Guided Tour Questions */}
        <div className="space-y-6 lg:col-span-1">
          {/* Quick Seed reset */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-50 mb-3">Database Seeder Reset</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Click to restore default files (SOPs, logs, contradictions, and inspections).
            </p>
            <button
              onClick={handleResetDatabase}
              disabled={seeding}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white font-medium py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className={seeding ? "animate-spin" : ""} size={16} />
              {seeding ? "Resetting..." : "Reset & Seed V2 Database"}
            </button>
            {seedSuccess && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-3 font-semibold flex items-center gap-1.5">
                <CheckCircle size={14} /> {seedSuccess}
              </p>
            )}
          </div>

          {/* Guided tour questions list */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-50 mb-4">Guided Demo Questions</h4>
            <div className="space-y-3">
              {questions.map((q) => (
                <button
                  key={q.id}
                  onClick={() => askQuestion(q.question)}
                  className="w-full text-left p-3.5 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl transition-colors flex justify-between items-center group"
                >
                  <div className="space-y-1 pr-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">{q.category}</span>
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 leading-normal">{q.question}</p>
                  </div>
                  <ChevronRight size={14} className="text-zinc-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Graph playback Scrubber */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Activity className="text-blue-500" size={18} /> Equipment Lifecycle Playback
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Replay the visual path of a component's timeline history.</p>
              </div>

              <select
                value={playbackEquipment}
                onChange={handleEquipmentChange}
                className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PUMP-07">PUMP-07</option>
                <option value="VALVE-12">VALVE-12</option>
              </select>
            </div>

            {/* Playback Progress Indicator */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full transition-colors flex items-center justify-center"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  onClick={() => { setCurrentEventIdx(0); setIsPlaying(false); }}
                  className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 p-2.5 rounded-full transition-colors flex items-center justify-center border border-zinc-200 dark:border-zinc-700"
                >
                  <RotateCcw size={16} />
                </button>
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max={events.length - 1}
                    value={currentEventIdx}
                    onChange={(e) => { setCurrentEventIdx(parseInt(e.target.value)); setIsPlaying(false); }}
                    className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              {/* Event Visual Timeline Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {events.map((ev, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => { setCurrentEventIdx(idx); setIsPlaying(false); }}
                    className={`p-4 border rounded-xl transition-all duration-300 cursor-pointer ${
                      currentEventIdx === idx
                        ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-500 shadow-md transform scale-[1.02]'
                        : 'bg-zinc-50 dark:bg-zinc-800/20 border-zinc-100 dark:border-zinc-800 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                        {ev.state}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">{ev.date}</span>
                    </div>
                    <h5 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-1">{ev.title}</h5>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">{ev.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Demo;
