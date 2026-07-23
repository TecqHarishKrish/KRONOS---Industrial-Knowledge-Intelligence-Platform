import React, { useEffect, useState } from 'react';
import { Calendar, Cpu, User } from 'lucide-react';
import api from '../services/api';

interface TimelineEvent {
  id: number;
  filename: string;
  file_type: string;
  version: number;
  uploaded_at: string;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  text_content: string;
  equipment: string;
  technician?: string;
  event_type: 'sop_upload' | 'repair' | 'inspection' | 'general';
}

const Timeline: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<string[]>([]);
  const [selectedEquip, setSelectedEquip] = useState<string>('');
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimelineData();
  }, []);

  useEffect(() => {
    if (selectedEquip) {
      generateTimeline(selectedEquip);
    }
  }, [selectedEquip]);

  const fetchTimelineData = async () => {
    try {
      const response = await api.get('/documents');
      const docs = response.data;
      
      // Extract unique equipment values
      const equips: string[] = [];
      docs.forEach((doc: any) => {
        doc.entities.forEach((ent: any) => {
          if (ent.entity_type === 'EQUIPMENT') {
            equips.push(ent.entity_value);
          }
        });
      });
      const uniqueEquips = Array.from(new Set(equips));
      setEquipmentList(uniqueEquips);
      if (uniqueEquips.length > 0) {
        setSelectedEquip(uniqueEquips[0]);
      }
    } catch (error) {
      console.error('Failed to load timeline documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeline = async (equip: string) => {
    try {
      const response = await api.get('/documents');
      const docs = response.data;

      // Filter documents containing this equipment
      const filtered = docs.filter((doc: any) => 
        doc.entities.some((ent: any) => ent.entity_type === 'EQUIPMENT' && ent.entity_value === equip)
      );

      // Map to timeline event objects
      const mappedEvents: TimelineEvent[] = filtered.map((doc: any) => {
        const text = doc.text_content || '';
        let type: 'sop_upload' | 'repair' | 'inspection' | 'general' = 'general';
        if (doc.filename.toLowerCase().includes('sop')) {
          type = 'sop_upload';
        } else if (text.toLowerCase().includes('repair') || text.toLowerCase().includes('replac')) {
          type = 'repair';
        } else if (text.toLowerCase().includes('inspect') || text.toLowerCase().includes('check')) {
          type = 'inspection';
        }

        // Try extracting technician name
        const techEntity = doc.entities.find((e: any) => e.entity_type === 'PERSON');

        return {
          id: doc.id,
          filename: doc.filename,
          file_type: doc.file_type,
          version: doc.version,
          uploaded_at: doc.uploaded_at,
          valid_from: doc.valid_from,
          valid_until: doc.valid_until,
          is_active: doc.is_active,
          text_content: text,
          equipment: equip,
          technician: techEntity ? techEntity.entity_value : 'System Process',
          event_type: type
        };
      });

      // Sort chronological: oldest first
      mappedEvents.sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
      setEvents(mappedEvents);
    } catch (error) {
      console.error('Failed to generate timeline events:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title & Equipment Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Timeline Explorer
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track equipment history, maintenance log sequence, and SOP update trails chronologically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Select Equipment:</label>
          <select
            value={selectedEquip}
            onChange={(e) => setSelectedEquip(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {equipmentList.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline Layout */}
      {events.length > 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 shadow-sm">
          <div className="relative border-l border-zinc-200 dark:border-zinc-850 ml-4 md:ml-32 space-y-12">
            
            {events.map((event) => {
              const uploadDate = new Date(event.uploaded_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });

              // Icon & color styling by event type
              let typeLabel = 'Document Upload';
              let colorClass = 'bg-blue-500 border-blue-200 dark:border-blue-900';
              if (event.event_type === 'sop_upload') {
                typeLabel = 'SOP Procedure Updated';
                colorClass = 'bg-indigo-500 border-indigo-200 dark:border-indigo-900';
              } else if (event.event_type === 'repair') {
                typeLabel = 'Maintenance Repair Performed';
                colorClass = 'bg-rose-500 border-rose-200 dark:border-rose-900';
              } else if (event.event_type === 'inspection') {
                typeLabel = 'Safety Inspection Completed';
                colorClass = 'bg-emerald-500 border-emerald-200 dark:border-emerald-900';
              }

              return (
                <div key={event.id} className="relative flex flex-col md:flex-row gap-6">
                  {/* Left Column (Desktop Date) */}
                  <div className="md:absolute md:-left-36 md:w-28 text-left md:text-right hidden md:block">
                    <span className="text-sm font-semibold text-zinc-400 font-mono">{uploadDate}</span>
                  </div>

                  {/* Dot on Line */}
                  <div className={`absolute -left-[20.5px] top-1.5 h-3.5 w-3.5 rounded-full border-4 border-white dark:border-zinc-900 ${colorClass.split(' ')[0]}`}></div>

                  {/* Right Content Box */}
                  <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-200 dark:border-zinc-850 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono">
                          {typeLabel}
                        </span>
                        <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
                          {event.filename}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                          v{event.version}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                          event.is_active 
                            ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400' 
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}>
                          {event.is_active ? 'Active Version' : 'Superseded'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Cpu size={14} />
                          <span>Equipment Component: <strong className="text-zinc-700 dark:text-zinc-300">{event.equipment}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500">
                          <User size={14} />
                          <span>Logged By: <strong className="text-zinc-700 dark:text-zinc-300">{event.technician}</strong></span>
                        </div>
                      </div>
                      
                      {event.valid_from && (
                        <div className="space-y-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-lg p-2">
                          <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Validity Window</p>
                          <p className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                            {new Date(event.valid_from).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })} - {event.valid_until ? new Date(event.valid_until).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'Indefinite'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-lg p-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 font-sans max-h-36 overflow-y-auto">
                      {event.text_content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <Calendar size={32} className="mx-auto text-zinc-400 mb-2" />
          <p className="text-sm">No timeline events found for {selectedEquip}.</p>
        </div>
      )}
    </div>
  );
};

export default Timeline;
