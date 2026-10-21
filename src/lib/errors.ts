export function getErrorContent(status: number) {
	if (status === 404)
		return {
			title: 'This trail ends here.',
			message:
				'The page may have moved, or the link may be incorrect. There is still plenty to explore.',
			retry: false
		};
	if (status === 403)
		return {
			title: 'This page is off limits.',
			message:
				'You do not have access to this page. Head back to the public portfolio or browse the research archive.',
			retry: false
		};
	if (status === 400)
		return {
			title: 'That request did not look right.',
			message: 'Check the address and try again, or start from the portfolio.',
			retry: false
		};
	return {
		title: 'Something interrupted the exploration.',
		message:
			'This page could not be loaded. Try reloading it. If the problem continues, come back a little later.',
		retry: true
	};
}
