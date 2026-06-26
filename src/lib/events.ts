export type EventCallback = (detail?: any) => void;
export type Unsubscribe = () => void;

class EventBus {
  emit(eventName: string, detail?: any): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
  }

  on(eventName: string, callback: EventCallback): Unsubscribe {
    if (typeof window === 'undefined') return () => {};
    
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      callback(customEvent.detail);
    };
    window.addEventListener(eventName, handler);
    return () => {
      window.removeEventListener(eventName, handler);
    };
  }
}

export const globalEvents = new EventBus();

export const EVENTS = {
  PRELOADER_DONE: "preloader-done",
  LOADER_PROGRESS: "loader-progress",
  VH_UPDATED: "vh-updated",
  LENIS_STOP: "lenis-stop",
  LENIS_START: "lenis-start",
} as const;
