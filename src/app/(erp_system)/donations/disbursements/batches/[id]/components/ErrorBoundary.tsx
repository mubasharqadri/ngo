"use client";
import { Component } from "react";
export class ErrorBoundary extends Component<{ children: React.ReactNode; fallback?: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? (this.props.fallback ?? <div className="card p-4">Something went wrong</div>) : this.props.children; }
}
