{{/*
Expand the name of the chart.
*/}}
{{- define "linkedeye-backend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "linkedeye-backend.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "linkedeye-backend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "linkedeye-backend.labels" -}}
helm.sh/chart: {{ include "linkedeye-backend.chart" . }}
{{ include "linkedeye-backend.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: linkedeye-itsm
{{- end }}

{{/*
Selector labels
*/}}
{{- define "linkedeye-backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "linkedeye-backend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Pod labels
*/}}
{{- define "linkedeye-backend.podLabels" -}}
{{ include "linkedeye-backend.selectorLabels" . }}
{{- if .Values.podLabels }}
{{- toYaml .Values.podLabels | nindent 8 }}
{{- end }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "linkedeye-backend.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "linkedeye-backend.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
