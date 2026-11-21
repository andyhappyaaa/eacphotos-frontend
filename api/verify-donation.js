/**
 * Vercel Serverless Function - 校验捐赠 checkout 是否真实完成
 *
 * 依赖环境变量：CREEM_API_KEY（同 create-donation.js）
 *
 * 说明：感谢页靠 onComplete 回调跳转 + 这里服务端核对该 checkout 确实存在/已支付，
 * 从而避免「没捐赠的人手动输入 /donate/thanks 也能看到」。
 */

export default async function handler(req, res) {
	const apiKey = String(process.env.CREEM_API_KEY || '').trim();
	if (!apiKey) {
		res.status(500).json({ error: '捐赠尚未配置' });
		return;
	}

	const checkoutId = String(req.body?.checkoutId || '').trim();
	if (!checkoutId) {
		res.status(400).json({ error: '缺少 checkout_id' });
		return;
	}

	try {
		const c = await fetch(
			`https://api.creem.io/v1/checkouts?checkout_id=${encodeURIComponent(checkoutId)}`,
			{ headers: { 'x-api-key': apiKey } }
		);
		const checkout = await c.json().catch(() => ({}));

		if (!c.ok) {
			res.status(200).json({ ok: false });
			return;
		}

		// checkout 存在即为有效；再尽量核对支付状态（字段名做兼容）
		const orderId = checkout.order_id || checkout.orderId || checkout.order?.id || '';
		const directStatus = checkout.status || checkout.order?.status || '';

		if (directStatus && directStatus !== 'paid' && directStatus !== 'completed' && directStatus !== 'fulfilled') {
			res.status(200).json({ ok: false });
			return;
		}

		if (orderId) {
			const t = await fetch(
				`https://api.creem.io/v1/transactions/search?order_id=${encodeURIComponent(orderId)}&page_size=1`,
				{ headers: { 'x-api-key': apiKey } }
			);
			const tx = await t.json().catch(() => ({}));
			const list = tx.transactions || tx.items || tx.data || [];
			const paid = (Array.isArray(list) ? list : []).some((x) => x.status === 'paid');
			res.status(200).json({ ok: paid });
			return;
		}

		// 无法进一步核对时，checkout 存在即视为有效
		res.status(200).json({ ok: true });
	} catch (err) {
		console.error('[verify-donation] error:', err);
		res.status(500).json({ error: '校验失败' });
	}
}
