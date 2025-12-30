/**
 * Initialize property store with seed data
 * This should be called once at app startup
 */

"use client"

import { initPropertyStore } from "./property-store"
import { mockProperties } from "./mock-data"

// Initialize store with mock properties
initPropertyStore(mockProperties)

