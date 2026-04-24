---
layout: page
title: Publications
permalink: /publications/
---

{% for pub in site.data.publications %}
<div class="publication-item">
  <div class="publication-year">{{ pub.year }}</div>
  <div class="publication-body">
    <h3 class="publication-title">
      {% if pub.url %}
      <a href="{{ pub.url }}">{{ pub.title }}</a>
      {% else %}
      {{ pub.title }}
      {% endif %}
    </h3>
    <p class="publication-authors">{{ pub.authors }}</p>
    <p class="publication-venue">
      <em>{{ pub.venue }}</em>{% if pub.volume %}, {{ pub.volume }}{% endif %}
      {% if pub.doi %}
      &middot; <a href="https://doi.org/{{ pub.doi }}" class="publication-doi">DOI</a>
      {% endif %}
    </p>
  </div>
</div>
{% endfor %}

<p class="publications-more">
  Full list on <a href="https://scholar.google.com/citations?user=5xTmvcYAAAAJ">Google Scholar</a>.
</p>
