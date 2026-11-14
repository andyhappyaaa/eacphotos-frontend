/**
 * Vercel Serverless Function - 创建 Creem 捐赠结账会话（一次性付款 / PWYW）
 *
 * 需要在 Vercel Dashboard 配置环境变量：
 * - CREEM_API_KEY：Creem API 密钥（服务端，勿暴露给前端）
 * - CREEM_PRODUCT_ID：一次性付款产品的 product_id（需在 Creem 后台开启 Pay what you want）
 */

export default async function handler(req, res) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method Not Allowed' });
		return;
	}

	const apiKey = String(process.env.CREEM_API_KEY || '').trim();
	const productId = String(process.env.CREEM_PRODUCT_ID || '').trim();

	if (!apiKey || !productId) {
		res.status(500).json({ error: '捐赠尚未配置' });
		return;
	}

	let amount = 0;
	try {
		amount = Number(req.body?.amount);
	} catch {
		/* ignore */
	}

	// 金额单位为分（cent），Creem 合法范围 100 ~ 99999999
	if (!Number.isInteger(amount) || amount < 100 || amount > 99999999) {
		res.status(400).json({ error: '无效金额' });
		return;
	}

	try {
		const response = await fetch('https://api.creem.io/v1/checkouts', {
			method: 'POST',
			headers: {
				'x-api-key': apiKey,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				product_id: productId,
				custom_price: amount,
				units: 1,
				request_id: `donate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
				success_url: 'https://eacof.org'
			})
		});

		const data = await response.json().catch(() => ({}));

		if (!response.ok) {
			res.status(response.status).json({ error: data?.message || data?.error || '创建结账会话失败' });
			return;
		}

		const checkoutUrl = data.checkout_url || data.checkoutUrl;
		if (!checkoutUrl) {
			res.status(500).json({ error: '未获取到结账链接' });
			return;
		}

		res.status(200).json({ checkoutUrl });
	} catch (err) {
		console.error('[create-donation] error:', err);
		res.status(500).json({ error: '创建结账会话失败' });
	}
}
