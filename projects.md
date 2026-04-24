---
layout: page
title: Projects
permalink: /projects/
---

{% for project in site.data.projects %}
<div class="project-card">
  <div class="project-card-header">
    <h3 class="project-card-title">
      {% if project.url %}
      <a href="{{ project.url }}">{{ project.name }}</a>
      {% else %}
      {{ project.name }}
      {% endif %}
    </h3>
    {% if project.repo %}
    <a href="{{ project.repo }}" class="project-repo-link" title="Source code">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016.02 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
    </a>
    {% endif %}
  </div>
  <p class="project-card-desc">{{ project.description }}</p>
  <div class="project-card-tags">
    {% for tag in project.tags %}
    <span class="tag">{{ tag }}</span>
    {% endfor %}
  </div>
</div>
{% endfor %}
