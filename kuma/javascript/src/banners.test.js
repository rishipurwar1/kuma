//@flow
import React from 'react';
import { act, create } from 'react-test-renderer';
import Banners from './banners.jsx';
import UserProvider from './user-provider.jsx';

import type { BannerProps } from './banners.jsx';

const mockUserData = { ...UserProvider.defaultUserData };

const banners: Array<BannerProps> = [
    {
        id: 'flag1',
        title: 'title1',
        copy: 'copy1',
        cta: 'cta1',
        url: 'link1',
        embargoDays: 1
    },
    {
        id: 'flag2',
        title: 'title2',
        copy: 'copy2',
        cta: 'cta2',
        url: 'link2',
        embargoDays: 2
    }
];

describe('Banners', () => {
    test('renders nothing if no waffle flags set', () => {
        let banner = create(
            <UserProvider.context.Provider value={mockUserData}>
                <Banners banners={banners} />
            </UserProvider.context.Provider>
        );

        expect(banner.toJSON()).toBe(null);
    });

    test('renders banners when their waffle flags are set', () => {
        for (let b of banners) {
            mockUserData.waffle.flags = { [b.id]: true };
            let banner = create(
                <UserProvider.context.Provider value={mockUserData}>
                    <Banners banners={banners} />
                </UserProvider.context.Provider>
            );

            let snapshot = JSON.stringify(banner.toJSON());
            expect(snapshot).toContain(b.title);
            expect(snapshot).toContain(b.copy);
            expect(snapshot).toContain(b.cta);
            expect(snapshot).toContain(b.url);
        }
    });

    test('renders first banner and not second when both flags are set', () => {
        mockUserData.waffle.flags = {
            [banners[0].id]: true,
            [banners[1].id]: true
        };
        let banner = create(
            <UserProvider.context.Provider value={mockUserData}>
                <Banners banners={banners} />
            </UserProvider.context.Provider>
        );

        let snapshot = JSON.stringify(banner.toJSON());
        expect(snapshot).toContain(banners[0].title);
        expect(snapshot).toContain(banners[0].copy);
        expect(snapshot).toContain(banners[0].cta);
        expect(snapshot).toContain(banners[0].url);

        expect(snapshot).not.toContain(banners[1].title);
        expect(snapshot).not.toContain(banners[1].copy);
        expect(snapshot).not.toContain(banners[1].cta);
        expect(snapshot).not.toContain(banners[1].url);
    });

    test('renders second active banner if first is embargoed', () => {
        mockUserData.waffle.flags = {
            [banners[0].id]: true,
            [banners[1].id]: true
        };

        localStorage.setItem(
            `banner.${banners[0].id}.embargoed_until`,
            String(Date.now() + 10000)
        );

        let banner = create(
            <UserProvider.context.Provider value={mockUserData}>
                <Banners banners={banners} />
            </UserProvider.context.Provider>
        );

        let snapshot = JSON.stringify(banner.toJSON());
        expect(snapshot).toContain(banners[1].title);
        expect(snapshot).toContain(banners[1].copy);
        expect(snapshot).toContain(banners[1].cta);
        expect(snapshot).toContain(banners[1].url);

        expect(snapshot).not.toContain(banners[0].title);
        expect(snapshot).not.toContain(banners[0].copy);
        expect(snapshot).not.toContain(banners[0].cta);
        expect(snapshot).not.toContain(banners[0].url);
    });

    test('renders nothing if all active banners are embargoed', () => {
        mockUserData.waffle.flags = {
            [banners[0].id]: true,
            [banners[1].id]: true
        };

        localStorage.setItem(
            `banner.${banners[0].id}.embargoed_until`,
            String(Date.now() + 10000)
        );
        localStorage.setItem(
            `banner.${banners[1].id}.embargoed_until`,
            String(Date.now() + 10000)
        );

        let banner = create(
            <UserProvider.context.Provider value={mockUserData}>
                <Banners banners={banners} />
            </UserProvider.context.Provider>
        );

        expect(banner.toJSON()).toBe(null);
    });

    test('embargos expire', () => {
        mockUserData.waffle.flags = {
            [banners[0].id]: true,
            [banners[1].id]: true
        };

        localStorage.setItem(
            `banner.${banners[0].id}.embargoed_until`,
            String(Date.now() + 10000)
        );
        localStorage.setItem(
            `banner.${banners[1].id}.embargoed_until`,
            String(Date.now() - 1)
        );

        let banner = create(
            <UserProvider.context.Provider value={mockUserData}>
                <Banners banners={banners} />
            </UserProvider.context.Provider>
        );

        let snapshot = JSON.stringify(banner.toJSON());
        expect(snapshot).toContain(banners[1].title);

        localStorage.setItem(
            `banner.${banners[0].id}.embargoed_until`,
            String(Date.now() - 1)
        );

        banner = create(
            <UserProvider.context.Provider value={mockUserData}>
                <Banners banners={banners} />
            </UserProvider.context.Provider>
        );

        snapshot = JSON.stringify(banner.toJSON());
        expect(snapshot).toContain(banners[0].title);
    });

    test('banners can be dismissed', () => {
        mockUserData.waffle.flags = {
            [banners[0].id]: true,
            [banners[1].id]: true
        };
        let banner = create(
            <UserProvider.context.Provider value={mockUserData}>
                <Banners banners={banners} />
            </UserProvider.context.Provider>
        );

        let snapshot = JSON.stringify(banner.toJSON());
        expect(snapshot).toContain(banners[0].title);
        expect(snapshot).toContain(banners[0].copy);
        expect(snapshot).toContain(banners[0].cta);
        expect(snapshot).toContain(banners[0].url);

        let button = banner.root.findByType('button');
        expect(button).toBeDefined();

        act(() => {
            // Simulate a click on the dismiss button
            button.props.onClick();
        });

        // Now that it is dismissed expect to render null
        expect(banner.toJSON()).toBe(null);

        // The banner should be embargoed now
        let value = localStorage.getItem(
            `banner.${banners[0].id}.embargoed_until`
        );
        let actualEmbargo = parseInt(value);
        let approximateEmbargo =
            (banners[0].embargoDays || 5) * 24 * 60 * 60 * 1000 + Date.now();
        let difference = approximateEmbargo - actualEmbargo;
        expect(difference).toBeGreaterThanOrEqual(0);
        expect(difference).toBeLessThan(100);

        // Re-render and expect the second banner
        banner = create(
            <UserProvider.context.Provider value={mockUserData}>
                <Banners banners={banners} />
            </UserProvider.context.Provider>
        );

        snapshot = JSON.stringify(banner.toJSON());
        expect(snapshot).toContain(banners[1].title);
        expect(snapshot).toContain(banners[1].copy);
        expect(snapshot).toContain(banners[1].cta);
        expect(snapshot).toContain(banners[1].url);

        // Dismiss the second banner
        button = banner.root.findByType('button');
        act(() => {
            // Simulate a click on the dismiss button
            button.props.onClick();
        });

        // Now that it is dismissed expect to render null
        expect(banner.toJSON()).toBe(null);

        // The banner should be embargoed now
        value = localStorage.getItem(`banner.${banners[1].id}.embargoed_until`);
        actualEmbargo = parseInt(value);
        approximateEmbargo =
            (banners[1].embargoDays || 5) * 24 * 60 * 60 * 1000 + Date.now();
        difference = approximateEmbargo - actualEmbargo;
        expect(difference).toBeGreaterThanOrEqual(0);
        expect(difference).toBeLessThan(100);

        // Do one final re-render and expect null since both are embargoed
        banner = create(
            <UserProvider.context.Provider value={mockUserData}>
                <Banners banners={banners} />
            </UserProvider.context.Provider>
        );

        expect(banner.toJSON()).toBe(null);
    });
});
