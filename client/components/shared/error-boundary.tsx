// Governed by .rules v1.0
'use client';

import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { COPY } from '@/constants/copy';

export interface ErrorBoundaryProps { children: ReactNode; }
export interface ErrorBoundaryState { hasError: boolean; }
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> { public state: ErrorBoundaryState = { hasError: false }; public static getDerivedStateFromError(): ErrorBoundaryState { return { hasError: true }; } public componentDidCatch(_error: Error, _info: ErrorInfo): void {} public render(): ReactNode { if (this.state.hasError) return <div className="p-10 text-text-primary">{COPY.common.error}</div>; return this.props.children; } }
