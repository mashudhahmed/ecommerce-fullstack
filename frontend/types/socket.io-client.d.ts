// frontend/types/socket.io-client.d.ts
declare module 'socket.io-client' {
  export interface Socket {
    // Add methods as needed
    on(event: string, callback: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): this;
    disconnect(): this;
    connected: boolean;
  }
  
  export function io(url: string, options?: any): Socket;
  export default io;
}