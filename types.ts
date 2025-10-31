export enum WindowType {
  Models = 'Models',
  APIs = 'APIs',
  Controllers = 'Controllers',
  Routes = 'Routes',
  Middleware = 'Middleware',
}

export interface ModelField {
  name: string;
  type: string;
}

export interface HistoryEntry<T> {
  timestamp: number;
  data: T;
  message?: string;
}

export interface Model {
  id: string;
  name: string;
  fields: ModelField[];
  code: string;
  history: HistoryEntry<Omit<Model, 'id' | 'history'>>[];
}

export interface Api {
  id: string;
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  code: string;
  requestBodyExample?: string;
  responseBodyExample?: string;
  history: HistoryEntry<Omit<Api, 'id' | 'history'>>[];
}

export interface ApiCollection {
  id: string;
  name: string;
  apis: Api[];
}

export interface Controller {
  id: string;
  name: string;
  code: string;
  history: HistoryEntry<Omit<Controller, 'id' | 'history'>>[];
}

export interface Route {
  id: string;
  name: string;
  code: string;
  history: HistoryEntry<Omit<Route, 'id' | 'history'>>[];
}

export interface Middleware {
    id: string;
    name: string;
    code: string;
    history: HistoryEntry<Omit<Middleware, 'id' | 'history'>>[];
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export interface ProjectState {
    models: Model[];
    apiCollections: ApiCollection[];
    controllers: Controller[];
    routes: Route[];
    middlewares: Middleware[];
    visibleWindows: WindowType[];
    activeFramework: string;
}

export interface Project {
  id: string;
  name: string;
  lastModified: number;
  state: ProjectState;
}
