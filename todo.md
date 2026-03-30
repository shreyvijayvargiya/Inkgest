Next is the add a tab for user, this form will be simple one instead of AI inkgest agent this will simply invoke backend APIs and return the response, 

Form fields are
1. Url to code
2. Image to code
3. Url/s + prompt to blog
4. Url/s + prompt to email
5. Url/s + prompt to Linkedin posts
6. Url/s + prompt to X posts 
7. Url/s + prompt to substack posts
8. Url/s + prompt to Infographics
10. Url/s + prompt to Table

the form is simple have input for adding Url and more than one URL and textarea for prompt for each and then invoke API for each one the URL for backend API is api.buildsaas.dev /scrape /url-to-code /image-to-code etc
I will add API later on, use react-query to make API call for each one and simply show response once we get the response, we store that asset in user DB same as we are storing the inkgest-agent one and user can view that asset

Make this frontend form with API invoking in one single component and import inside /app and render the simple tab and put the existing inkgest-agent in AI builder tab