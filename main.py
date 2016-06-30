import webapp2
import os
import logging
import jinja2

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

class MainHandler(webapp2.RequestHandler):
    def get(self):
        path = self.request.path
        if path == '/':
            path = path + 'home.html'

        template = JINJA_ENVIRONMENT.get_template('templates' + path)

        path = path[1:-5]
        infoDict = {'page': path.title() , path : True}

        self.response.write(template.render(infoDict))

app = webapp2.WSGIApplication([
    ('/', MainHandler),
    ('/home.html', MainHandler),
    ('/skills.html', MainHandler),
    ('/pictures.html', MainHandler),
    ('/contact.html', MainHandler)
], debug=True)