import asyncio


def test_run():
    from bee2bee.nat import try_upnp_map, try_stun
    ok, ip = asyncio.run(try_upnp_map(5555))
    assert ok in (True, False)
    assert (ip is None) or isinstance(ip, str)

    out = asyncio.run(try_stun())
    assert out is None or (
        isinstance(out, tuple) and isinstance(out[0], str) and isinstance(out[1], int)
    )

