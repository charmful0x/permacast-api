const html =

`

<html>
<head>
	<meta charset="utf-8">
	<title>permacast api helper</title>
</head>
<body>

<h1>supported GET/ requests</h1>
<ul>
	<li>/rss/:contractID/:podcastID : returns a JSON'd XML of an RSS feed of the given podcast ID</li>
	<li>/staking/:limit : returns the top podcasts per staked $NEWS token amount ranked according to "limit" </li>
</ul>
</body>
</html>

`

module.exports = { html }