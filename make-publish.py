#!/usr/bin/env python3
"""Copies dist/ to publish/ and turns index.html into the fragment the Artifact host wraps."""
import re, shutil, os
shutil.rmtree('publish', ignore_errors=True)
shutil.copytree('dist', 'publish')
s = open('publish/index.html').read()
head = re.search(r'<head>(.*?)</head>', s, re.S).group(1)
head = re.sub(r'<meta[^>]*>\s*', '', head)
body_m = re.search(r'<body([^>]*)>(.*)</body>', s, re.S)
body_cls = re.search(r'class="([^"]*)"', body_m.group(1))
body = body_m.group(2)
frag = head.strip() + '\n<script>document.body.classList.add(' + repr(body_cls.group(1) if body_cls else '') + ');</script>\n' + body.strip() + '\n'
open('publish/index.html', 'w').write(frag)
