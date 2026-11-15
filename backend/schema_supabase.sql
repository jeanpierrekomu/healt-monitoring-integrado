-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.devices (
  device_id text NOT NULL CHECK (device_id ~ '^[a-z0-9-]+$'::text AND length(device_id) <= 64),
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT devices_pkey PRIMARY KEY (device_id)
);
CREATE TABLE public.crew_members (
  id text NOT NULL,
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  crew_role USER-DEFINED NOT NULL,
  public_profile jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT crew_members_pkey PRIMARY KEY (id)
);
CREATE TABLE public.missions (
  id text NOT NULL,
  name text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'active'::mission_status,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  CONSTRAINT missions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.mission_members (
  mission_id text NOT NULL,
  crew_member_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mission_members_pkey PRIMARY KEY (mission_id, crew_member_id),
  CONSTRAINT mission_members_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id),
  CONSTRAINT mission_members_crew_member_id_fkey FOREIGN KEY (crew_member_id) REFERENCES public.crew_members(id)
);
CREATE TABLE public.device_assignments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  device_id text NOT NULL,
  crew_member_id text NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  released_at timestamp with time zone,
  CONSTRAINT device_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT device_assignments_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(device_id),
  CONSTRAINT device_assignments_crew_member_id_fkey FOREIGN KEY (crew_member_id) REFERENCES public.crew_members(id)
);
CREATE TABLE public.sessions (
  id text NOT NULL,
  device_id text NOT NULL,
  source USER-DEFINED NOT NULL DEFAULT 'LIVE'::data_source,
  label text NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(device_id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9][a-z0-9._-]*$'::text AND length(username) >= 3 AND length(username) <= 32),
  role USER-DEFINED NOT NULL DEFAULT 'astronaut'::user_role,
  crew_member_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_crew_member_id_fkey FOREIGN KEY (crew_member_id) REFERENCES public.crew_members(id)
);
CREATE TABLE public.readings (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  session_id text NOT NULL,
  device_id text NOT NULL,
  crew_member_id text,
  seq integer NOT NULL CHECK (seq >= 0),
  uptime_ms bigint NOT NULL CHECK (uptime_ms >= 0),
  received_at timestamp with time zone NOT NULL,
  source USER-DEFINED NOT NULL DEFAULT 'LIVE'::data_source,
  schema_version text NOT NULL DEFAULT '1.1'::text CHECK (schema_version = '1.1'::text),
  sampling_rate_hz real NOT NULL DEFAULT 1.0 CHECK (sampling_rate_hz > 0::double precision),
  heart_rate_bpm real CHECK (heart_rate_bpm >= 0::double precision AND heart_rate_bpm <= 300::double precision),
  contact_temperature_c real CHECK (contact_temperature_c >= 0::double precision AND contact_temperature_c <= 60::double precision),
  accel_min_m_s2 real CHECK (accel_min_m_s2 >= 0::double precision AND accel_min_m_s2 <= 200::double precision),
  accel_max_m_s2 real CHECK (accel_max_m_s2 >= 0::double precision AND accel_max_m_s2 <= 200::double precision),
  accel_mean_m_s2 real CHECK (accel_mean_m_s2 >= 0::double precision AND accel_mean_m_s2 <= 200::double precision),
  spo2_pct real CHECK (spo2_pct >= 0::double precision AND spo2_pct <= 100::double precision),
  accel_x_m_s2 real CHECK (accel_x_m_s2 >= '-200'::integer::double precision AND accel_x_m_s2 <= 200::double precision),
  gyro_x_dps real CHECK (gyro_x_dps >= '-2000'::integer::double precision AND gyro_x_dps <= 2000::double precision),
  accel_y_m_s2 real CHECK (accel_y_m_s2 >= '-200'::integer::double precision AND accel_y_m_s2 <= 200::double precision),
  gyro_y_dps real CHECK (gyro_y_dps >= '-2000'::integer::double precision AND gyro_y_dps <= 2000::double precision),
  accel_z_m_s2 real CHECK (accel_z_m_s2 >= '-200'::integer::double precision AND accel_z_m_s2 <= 200::double precision),
  gyro_z_dps real CHECK (gyro_z_dps >= '-2000'::integer::double precision AND gyro_z_dps <= 2000::double precision),
  sleep_mode_active boolean NOT NULL DEFAULT false,
  ppg_contact USER-DEFINED NOT NULL DEFAULT 'unknown'::ppg_contact_status,
  motion_artifact boolean NOT NULL DEFAULT false,
  spo2_signal_quality USER-DEFINED NOT NULL DEFAULT 'unknown'::spo2_quality_status,
  missing jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT readings_pkey PRIMARY KEY (id),
  CONSTRAINT readings_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT readings_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(device_id),
  CONSTRAINT readings_crew_member_id_fkey FOREIGN KEY (crew_member_id) REFERENCES public.crew_members(id)
);
CREATE TABLE public.insights (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  schema_version text NOT NULL DEFAULT '1.1'::text CHECK (schema_version = '1.1'::text),
  session_id text NOT NULL,
  device_id text NOT NULL,
  crew_member_id text,
  seq integer NOT NULL,
  created_at timestamp with time zone NOT NULL,
  risk_level USER-DEFINED NOT NULL,
  method USER-DEFINED NOT NULL DEFAULT 'rules'::analysis_method,
  version text NOT NULL DEFAULT '1.1'::text,
  score real,
  reason_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT insights_pkey PRIMARY KEY (id),
  CONSTRAINT insights_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT insights_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(device_id),
  CONSTRAINT insights_crew_member_id_fkey FOREIGN KEY (crew_member_id) REFERENCES public.crew_members(id)
);
CREATE TABLE public.events (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  session_id text,
  device_id text,
  crew_member_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  kind USER-DEFINED NOT NULL,
  severity USER-DEFINED NOT NULL,
  code text NOT NULL,
  message text NOT NULL,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT events_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(device_id),
  CONSTRAINT events_crew_member_id_fkey FOREIGN KEY (crew_member_id) REFERENCES public.crew_members(id)
);
CREATE TABLE public.model_runs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  model_name text NOT NULL,
  model_version text NOT NULL,
  status USER-DEFINED NOT NULL,
  source USER-DEFINED NOT NULL DEFAULT 'LIVE'::data_source,
  modality USER-DEFINED NOT NULL,
  crew_member_id text,
  scenario text,
  input_duration_s real CHECK (input_duration_s IS NULL OR input_duration_s > 0::double precision),
  started_at timestamp with time zone NOT NULL,
  completed_at timestamp with time zone,
  CONSTRAINT model_runs_pkey PRIMARY KEY (id),
  CONSTRAINT model_runs_crew_member_id_fkey FOREIGN KEY (crew_member_id) REFERENCES public.crew_members(id)
);
CREATE TABLE public.findings (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  model_run_id bigint NOT NULL,
  crew_member_id text,
  kind USER-DEFINED NOT NULL,
  label USER-DEFINED NOT NULL,
  confidence real NOT NULL CHECK (confidence >= 0::double precision AND confidence <= 1::double precision),
  start_s real NOT NULL CHECK (start_s >= 0::double precision),
  end_s real NOT NULL CHECK (end_s >= 0::double precision),
  evidence jsonb NOT NULL DEFAULT '{"media_ref": null, "description": ""}'::jsonb,
  review_status USER-DEFINED NOT NULL DEFAULT 'pending'::review_status_type,
  CONSTRAINT findings_pkey PRIMARY KEY (id),
  CONSTRAINT findings_model_run_id_fkey FOREIGN KEY (model_run_id) REFERENCES public.model_runs(id),
  CONSTRAINT findings_crew_member_id_fkey FOREIGN KEY (crew_member_id) REFERENCES public.crew_members(id)
);
CREATE TABLE public.alerts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  crew_member_id text,
  priority USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'open'::alert_status_type,
  reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT alerts_pkey PRIMARY KEY (id),
  CONSTRAINT alerts_crew_member_id_fkey FOREIGN KEY (crew_member_id) REFERENCES public.crew_members(id)
);
CREATE TABLE public.alert_links (
  alert_id bigint NOT NULL,
  target_kind text NOT NULL CHECK (target_kind = ANY (ARRAY['reading'::text, 'insight'::text, 'finding'::text])),
  target_id bigint NOT NULL,
  CONSTRAINT alert_links_pkey PRIMARY KEY (alert_id, target_kind, target_id),
  CONSTRAINT alert_links_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.alerts(id)
);
CREATE TABLE public.alert_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  alert_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status USER-DEFINED NOT NULL,
  comment text NOT NULL DEFAULT ''::text,
  action text,
  actor text NOT NULL,
  actor_role USER-DEFINED NOT NULL DEFAULT 'doctor'::user_role,
  CONSTRAINT alert_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT alert_reviews_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.alerts(id)
);
CREATE TABLE public.nasa_imports (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  crew_member_id text NOT NULL,
  endpoint text NOT NULL,
  mode text NOT NULL,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  http_status integer,
  response_bytes integer,
  status text NOT NULL,
  detail text,
  CONSTRAINT nasa_imports_pkey PRIMARY KEY (id),
  CONSTRAINT nasa_imports_crew_member_id_fkey FOREIGN KEY (crew_member_id) REFERENCES public.crew_members(id)
);
CREATE TABLE public.musculoskeletal_scans (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  crew_member_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  blue_suit_verified boolean NOT NULL DEFAULT true,
  posture_symmetry_score real NOT NULL,
  biomechanical_metrics jsonb NOT NULL,
  skeleton_3d_joints jsonb NOT NULL,
  snapshot_url text,
  CONSTRAINT musculoskeletal_scans_pkey PRIMARY KEY (id),
  CONSTRAINT musculoskeletal_scans_crew_member_id_fkey FOREIGN KEY (crew_member_id) REFERENCES public.crew_members(id)
);