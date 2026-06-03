# blog.nodrama.io — local helpers.
#
#   make preview   # open the /regimes dashboard locally (no Jekyll needed)
#   make serve     # run the full Jekyll site at http://127.0.0.1:4000
#   make build     # build the site into _site/
#   make clean     # remove _preview/ and _site/
#
# `preview` composes regimes/index.html + the real regimes.css/app.js into a
# standalone file (feed inlined, works over file://) and opens it. `serve`
# renders the real site (needs Ruby + `bundle install` once).

.PHONY: preview serve build clean

preview:
	python3 scripts/preview.py

serve:
	bundle exec jekyll serve --host 127.0.0.1 --port 4000 --livereload --open-url http://127.0.0.1:4000/regimes/

build:
	bundle exec jekyll build

clean:
	rm -rf _preview _site
	@echo "removed _preview/ and _site/"
