# 0018. Enhanced Student Onboarding

**Date**: 2026-10-24
**Status**: Accepted

## Summary

You can guide new students through a comprehensive four step onboarding wizard that collects their university, faculty, program, target exam goal, demographics, and year of study. This ensures that every student gets a deeply personalized artificial intelligence tutor experience and precise academic context while keeping the wizard fast and engaging.

## Context

Cameroon has major universities like the University of Yaounde I, University of Buea, University of Douala, University of Dschang, University of Bamenda, and University of Maroua, along with specialized institutions. Collecting institution, faculty, program, target goal, gender, and age allows the artificial intelligence tutor and study tools to provide highly relevant context, localized examples, and accurate readiness tracking.

## Requirements

- **AC-1**: New users complete a four step onboarding wizard collecting institution, faculty, program, goal, gender, age, and year of study.
- **AC-2**: The database user model stores these extended fields securely.
- **AC-3**: The onboarding api endpoints validate and persist all extended demographic and academic fields.
- **AC-4**: The artificial intelligence prompt system and analytics consume these fields for contextual tutoring.
- **AC-5**: Students can view and update their profile details from their settings page at any time.

## Feature design

**Data model additions on User**:
- `institution` (String, nullable)
- `faculty` (String, nullable)
- `program` (String, nullable)
- `targetGoal` (String, nullable)
- `gender` (Gender enum: MALE, FEMALE, nullable)
- `age` (Int, nullable)

**Wizard steps**:
1. Institution and Faculty
2. Program and Target Goal
3. Demographics (Gender and Age)
4. Year of Study (Level)
